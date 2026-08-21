DROP POLICY IF EXISTS "System can create default subscriptions" ON public.subscriptions;

CREATE POLICY "Cabana owner can create default free subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cabañas c
    WHERE c.id = subscriptions."cabaña_id"
      AND c.owner_id = auth.uid()
  )
  AND plan = 'free'::subscription_plan
  AND max_animals <= 50
  AND max_users <= 2
  AND coalesce(is_active, false) = false
  AND coalesce(is_trial_active, false) = false
  AND coalesce(subscription_status, 'free') IN ('free','inactive')
  AND paddle_subscription_id IS NULL
  AND paddle_customer_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s2
    WHERE s2."cabaña_id" = subscriptions."cabaña_id"
  )
);

DROP POLICY IF EXISTS "Users can create subscription for their cabaña" ON public.subscriptions;

CREATE POLICY "Members can create default free subscription for own cabaña"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  "cabaña_id" = public.get_current_user_cabana_id()
  AND plan = 'free'::subscription_plan
  AND max_animals <= 50
  AND max_users <= 2
  AND coalesce(is_active, false) = false
  AND coalesce(is_trial_active, false) = false
  AND coalesce(subscription_status, 'free') IN ('free','inactive')
  AND paddle_subscription_id IS NULL
  AND paddle_customer_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s2
    WHERE s2."cabaña_id" = subscriptions."cabaña_id"
  )
);