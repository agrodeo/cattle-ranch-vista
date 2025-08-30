-- Create/update billing tables for Mercado Pago subscriptions

-- Update billing_products if needed
INSERT INTO public.billing_products (code, name, description) VALUES
('personal', 'Personal', 'Hasta 200 animales'),
('productor', 'Productor', 'Hasta 1.000 animales'),
('cabana', 'Cabaña', 'Hasta 5.000 animales'),
('corporativo', 'Corporativo', 'Ilimitado')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Create billing_prices table if not exists
CREATE TABLE IF NOT EXISTS public.billing_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL REFERENCES public.billing_products(code),
  provider text NOT NULL DEFAULT 'mp',
  currency text NOT NULL DEFAULT 'ARS',
  amount_cents int NOT NULL,
  interval text NOT NULL DEFAULT 'month',
  external_sku text,              -- preapproval_plan_id from MP
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Update billing_customers to match MP requirements
ALTER TABLE public.billing_customers 
ADD COLUMN IF NOT EXISTS mp_payer_email text,
ADD COLUMN IF NOT EXISTS mp_preapproval_id text;

-- Update billing_subscriptions to match MP requirements
ALTER TABLE public.billing_subscriptions 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ARS';

-- Insert sample prices for testing (adjust later)
INSERT INTO public.billing_prices (product_code, provider, currency, amount_cents, interval, active) VALUES
('personal', 'mp', 'ARS', 1500000, 'month', true),      -- $15,000 ARS
('productor', 'mp', 'ARS', 3000000, 'month', true),     -- $30,000 ARS
('cabana', 'mp', 'ARS', 6000000, 'month', true),        -- $60,000 ARS
('corporativo', 'mp', 'ARS', 12000000, 'month', true)   -- $120,000 ARS
ON CONFLICT DO NOTHING;

-- Enable RLS on new table
ALTER TABLE public.billing_prices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prices
DROP POLICY IF EXISTS "prices_ro" ON public.billing_prices;
CREATE POLICY "prices_ro" ON public.billing_prices FOR SELECT USING (true);

-- Update existing policies to use correct function
DROP POLICY IF EXISTS "customers_rw" ON public.billing_customers;
DROP POLICY IF EXISTS "subscriptions_ro" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "payments_ro" ON public.billing_payments;

CREATE POLICY "customers_rw" ON public.billing_customers
  FOR ALL USING (cabana_id = get_current_user_cabana_id())
  WITH CHECK (cabana_id = get_current_user_cabana_id());

CREATE POLICY "subscriptions_ro" ON public.billing_subscriptions
  FOR SELECT USING (cabana_id = get_current_user_cabana_id());

CREATE POLICY "payments_ro" ON public.billing_payments
  FOR SELECT USING (cabana_id = get_current_user_cabana_id());

-- Admin policies for full management
DROP POLICY IF EXISTS "admin_customers_management" ON public.billing_customers;
DROP POLICY IF EXISTS "admin_subscriptions_management" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "admin_payments_management" ON public.billing_payments;
DROP POLICY IF EXISTS "admin_prices_management" ON public.billing_prices;

CREATE POLICY "admin_customers_management" ON public.billing_customers
  FOR ALL USING (true);

CREATE POLICY "admin_subscriptions_management" ON public.billing_subscriptions
  FOR ALL USING (true);

CREATE POLICY "admin_payments_management" ON public.billing_payments
  FOR ALL USING (true);

CREATE POLICY "admin_prices_management" ON public.billing_prices
  FOR ALL USING (true);