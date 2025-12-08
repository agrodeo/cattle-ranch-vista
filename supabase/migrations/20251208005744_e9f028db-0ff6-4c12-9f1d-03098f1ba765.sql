-- Drop overly permissive admin policies on billing tables
DROP POLICY IF EXISTS "admin_customers_management" ON billing_customers;
DROP POLICY IF EXISTS "admin_payments_management" ON billing_payments;
DROP POLICY IF EXISTS "admin_billing_management" ON billing_subscriptions;

-- Create service-role-only policies for billing_customers
-- Service role bypasses RLS, so we just need restrictive policies for regular users
CREATE POLICY "service_role_customers_management" ON billing_customers
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create service-role-only policies for billing_payments
CREATE POLICY "service_role_payments_management" ON billing_payments
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create service-role-only policies for billing_subscriptions
CREATE POLICY "service_role_subscriptions_management" ON billing_subscriptions
FOR ALL TO service_role USING (true) WITH CHECK (true);