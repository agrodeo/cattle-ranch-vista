-- Fix billing_prices table creation (need billing_interval not interval)
DROP TABLE IF EXISTS public.billing_prices;

CREATE TABLE public.billing_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL REFERENCES public.billing_products(code),
  provider text NOT NULL DEFAULT 'mp',
  currency text NOT NULL DEFAULT 'ARS',
  amount_cents int NOT NULL,
  billing_interval text NOT NULL DEFAULT 'month',  -- Changed from interval to billing_interval
  external_sku text,              -- preapproval_plan_id from MP
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert sample prices for testing (adjust later)
INSERT INTO public.billing_prices (product_code, provider, currency, amount_cents, billing_interval, active) VALUES
('personal', 'mp', 'ARS', 1500000, 'month', true),      -- $15,000 ARS
('productor', 'mp', 'ARS', 3000000, 'month', true),     -- $30,000 ARS
('cabana', 'mp', 'ARS', 6000000, 'month', true),        -- $60,000 ARS
('corporativo', 'mp', 'ARS', 12000000, 'month', true)   -- $120,000 ARS
ON CONFLICT DO NOTHING;

-- Enable RLS on new table
ALTER TABLE public.billing_prices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prices
CREATE POLICY "prices_ro" ON public.billing_prices FOR SELECT USING (true);
CREATE POLICY "admin_prices_management" ON public.billing_prices FOR ALL USING (true);