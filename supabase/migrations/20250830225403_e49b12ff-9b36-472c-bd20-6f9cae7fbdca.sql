-- Create unified billing system tables

-- Plans/Products catalog
CREATE TABLE IF NOT EXISTS public.billing_products (
  code TEXT PRIMARY KEY,          -- 'personal'|'productor'|'cabana'|'corporativo'
  name TEXT NOT NULL,
  description TEXT
);

-- Price catalog per provider
CREATE TABLE IF NOT EXISTS public.billing_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL REFERENCES public.billing_products(code),
  provider TEXT NOT NULL,         -- 'mp'|'app_store'|'play'
  currency TEXT NOT NULL,         -- 'ARS'|'USD'
  amount_cents INTEGER NOT NULL,
  interval_type TEXT NOT NULL DEFAULT 'month',
  external_sku TEXT,              -- AppStore/Play productId
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One payer profile per cabana
CREATE TABLE IF NOT EXISTS public.billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabana_id UUID NOT NULL UNIQUE,
  country_code TEXT,
  last_provider TEXT,             -- 'mp'|'app_store'|'play'
  mp_payer_id TEXT,
  appstore_original_transaction_id TEXT,
  play_purchase_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unified subscription state (source of truth for access)
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabana_id UUID NOT NULL,
  product_code TEXT NOT NULL REFERENCES public.billing_products(code),
  provider TEXT NOT NULL,         -- 'mp'|'app_store'|'play'
  status TEXT NOT NULL,           -- 'trialing','active','past_due','canceled','in_grace'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  external_id TEXT,               -- MP payment/preapproval id | AppStore originalTransactionId | Play purchaseToken
  currency TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payments audit
CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabana_id UUID NOT NULL,
  provider TEXT NOT NULL,         -- 'mp'|'app_store'|'play'
  external_payment_id TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT,
  status TEXT NOT NULL,           -- 'approved','completed','pending','refunded','failed'
  happened_at TIMESTAMPTZ DEFAULT now(),
  raw JSONB
);

-- Enable RLS
ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read for cabana members)
CREATE POLICY "products_ro" ON public.billing_products FOR SELECT USING (true);
CREATE POLICY "prices_ro" ON public.billing_prices FOR SELECT USING (true);

CREATE POLICY "customers_rw" ON public.billing_customers 
  FOR ALL USING (cabana_id = get_current_user_cabana_id());

CREATE POLICY "subscriptions_ro" ON public.billing_subscriptions
  FOR SELECT USING (cabana_id = get_current_user_cabana_id());

CREATE POLICY "payments_ro" ON public.billing_payments
  FOR SELECT USING (cabana_id = get_current_user_cabana_id());

-- Admin policies for system operations
CREATE POLICY "admin_billing_management" ON public.billing_subscriptions
  FOR ALL USING (true);

CREATE POLICY "admin_payments_management" ON public.billing_payments  
  FOR ALL USING (true);

CREATE POLICY "admin_customers_management" ON public.billing_customers
  FOR ALL USING (true);

-- Seed minimal products
INSERT INTO public.billing_products (code, name, description) VALUES
('personal', 'Personal', 'Up to 200 animals'),
('productor', 'Productor', 'Up to 1,000 animals'),
('cabana', 'Cabaña', 'Up to 5,000 animals'),
('corporativo', 'Corporativo', 'Unlimited')
ON CONFLICT (code) DO NOTHING;

-- Seed ARS prices for Mercado Pago (web)
INSERT INTO public.billing_prices (product_code, provider, currency, amount_cents, external_sku) VALUES
('personal', 'mp', 'ARS', 2490000, 'personal_monthly_ars'),
('productor', 'mp', 'ARS', 6990000, 'productor_monthly_ars'),
('cabana', 'mp', 'ARS', 14900000, 'cabana_monthly_ars'),
('corporativo', 'mp', 'ARS', 15900000, 'corporativo_monthly_ars')
ON CONFLICT DO NOTHING;

-- Seed USD prices for App Store and Google Play  
INSERT INTO public.billing_prices (product_code, provider, currency, amount_cents, external_sku) VALUES
('personal', 'app_store', 'USD', 2999, 'personal_monthly'),
('productor', 'app_store', 'USD', 6999, 'productor_monthly'),
('cabana', 'app_store', 'USD', 14999, 'cabana_monthly'),
('corporativo', 'app_store', 'USD', 15999, 'corporativo_monthly'),
('personal', 'play', 'USD', 2999, 'personal_monthly'),
('productor', 'play', 'USD', 6999, 'productor_monthly'),
('cabana', 'play', 'USD', 14999, 'cabana_monthly'),
('corporativo', 'play', 'USD', 15999, 'corporativo_monthly')
ON CONFLICT DO NOTHING;

-- Create function to get plan limits
CREATE OR REPLACE FUNCTION public.get_plan_limits(plan_code TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE plan_code
    WHEN 'personal' THEN '{"max_animals": 200, "max_users": 3}'::jsonb
    WHEN 'productor' THEN '{"max_animals": 1000, "max_users": 5}'::jsonb
    WHEN 'cabana' THEN '{"max_animals": 5000, "max_users": 15}'::jsonb
    WHEN 'corporativo' THEN '{"max_animals": 999999, "max_users": 999999}'::jsonb
    ELSE '{"max_animals": 50, "max_users": 2}'::jsonb
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current entitlements
CREATE OR REPLACE FUNCTION public.get_current_entitlements(cabana_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  active_sub RECORD;
  result JSONB;
BEGIN
  -- Get the most recent active subscription
  SELECT * INTO active_sub
  FROM public.billing_subscriptions
  WHERE cabana_id = cabana_uuid
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())
  ORDER BY current_period_end DESC NULLS LAST
  LIMIT 1;
  
  IF active_sub IS NULL THEN
    -- No active subscription, return free plan limits
    result := jsonb_build_object(
      'active', false,
      'product_code', 'free',
      'provider', null,
      'current_period_end', null,
      'limits', get_plan_limits('free')
    );
  ELSE
    -- Active subscription found
    result := jsonb_build_object(
      'active', true,
      'product_code', active_sub.product_code,
      'provider', active_sub.provider,
      'current_period_end', active_sub.current_period_end,
      'limits', get_plan_limits(active_sub.product_code)
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;