-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "products_ro" ON public.billing_products;
DROP POLICY IF EXISTS "prices_ro" ON public.billing_prices;

-- Create unified billing system tables
CREATE TABLE IF NOT EXISTS public.billing_products (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.billing_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL REFERENCES public.billing_products(code),
  provider TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  interval_type TEXT NOT NULL DEFAULT 'month',
  external_sku TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabana_id UUID NOT NULL UNIQUE,
  country_code TEXT,
  last_provider TEXT,
  mp_payer_id TEXT,
  appstore_original_transaction_id TEXT,
  play_purchase_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabana_id UUID NOT NULL,
  product_code TEXT NOT NULL REFERENCES public.billing_products(code),
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  external_id TEXT,
  currency TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabana_id UUID NOT NULL,
  provider TEXT NOT NULL,
  external_payment_id TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT,
  status TEXT NOT NULL,
  happened_at TIMESTAMPTZ DEFAULT now(),
  raw JSONB
);

-- Enable RLS
ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "products_ro" ON public.billing_products FOR SELECT USING (true);
CREATE POLICY "prices_ro" ON public.billing_prices FOR SELECT USING (true);

CREATE POLICY "customers_rw" ON public.billing_customers 
  FOR ALL USING (cabana_id = get_current_user_cabana_id());

CREATE POLICY "subscriptions_ro" ON public.billing_subscriptions
  FOR SELECT USING (cabana_id = get_current_user_cabana_id());

CREATE POLICY "payments_ro" ON public.billing_payments
  FOR SELECT USING (cabana_id = get_current_user_cabana_id());

-- System policies for edge functions
CREATE POLICY "system_billing_management" ON public.billing_subscriptions
  FOR ALL USING (true);

CREATE POLICY "system_payments_management" ON public.billing_payments  
  FOR ALL USING (true);

CREATE POLICY "system_customers_management" ON public.billing_customers
  FOR ALL USING (true);

-- Seed products
INSERT INTO public.billing_products (code, name, description) VALUES
('personal', 'Personal', 'Up to 200 animals'),
('productor', 'Productor', 'Up to 1,000 animals'),
('cabana', 'Cabaña', 'Up to 5,000 animals'),
('corporativo', 'Corporativo', 'Unlimited')
ON CONFLICT (code) DO NOTHING;

-- Create plan limits function
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

-- Create entitlements function
CREATE OR REPLACE FUNCTION public.get_current_entitlements(cabana_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  active_sub RECORD;
  result JSONB;
BEGIN
  SELECT * INTO active_sub
  FROM public.billing_subscriptions
  WHERE cabana_id = cabana_uuid
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())
  ORDER BY current_period_end DESC NULLS LAST
  LIMIT 1;
  
  IF active_sub IS NULL THEN
    result := jsonb_build_object(
      'active', false,
      'product_code', 'free',
      'provider', null,
      'current_period_end', null,
      'limits', get_plan_limits('free')
    );
  ELSE
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