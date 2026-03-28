
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "admin_prices_management" ON billing_prices;

-- Allow everyone to read prices (public catalog data)
CREATE POLICY "Anyone can read prices"
ON billing_prices FOR SELECT
USING (true);

-- Only service_role can modify prices
CREATE POLICY "Service role can manage prices"
ON billing_prices FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
