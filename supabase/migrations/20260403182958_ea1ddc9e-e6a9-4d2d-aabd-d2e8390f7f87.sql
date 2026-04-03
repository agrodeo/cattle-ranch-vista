-- Add unique constraint on (cabana_id, provider) so upserts work correctly
-- and prevent duplicate active subscriptions per provider
ALTER TABLE public.billing_subscriptions 
  ADD CONSTRAINT billing_subscriptions_cabana_provider_unique 
  UNIQUE (cabana_id, provider);