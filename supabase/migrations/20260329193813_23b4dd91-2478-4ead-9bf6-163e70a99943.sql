DROP FUNCTION IF EXISTS public.get_subscription_status(uuid);

CREATE FUNCTION public.get_subscription_status(cabana_uuid uuid)
RETURNS TABLE(
  plan text,
  is_trial_active boolean,
  trial_days_remaining integer,
  is_subscription_active boolean,
  max_animals integer,
  current_animals_count integer,
  can_add_animals boolean,
  is_read_only boolean,
  subscription_end_date timestamptz,
  trial_end_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
  billing_sub RECORD;
  animals_count INTEGER;
  trial_days INTEGER;
  is_trial_active_val BOOLEAN;
  is_read_only_val BOOLEAN;
  effective_sub_end timestamptz;
BEGIN
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE cabaña_id = cabana_uuid;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (cabaña_id, plan, max_animals)
    VALUES (cabana_uuid, 'free', 50)
    RETURNING * INTO sub_record;
  END IF;

  -- Try to get end date from billing_subscriptions if subscriptions table lacks it
  effective_sub_end := sub_record.subscription_end_date;
  IF effective_sub_end IS NULL THEN
    SELECT current_period_end, trial_end INTO billing_sub
    FROM public.billing_subscriptions
    WHERE cabana_id = cabana_uuid AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    IF FOUND THEN
      effective_sub_end := billing_sub.current_period_end;
    END IF;
  END IF;

  SELECT COUNT(*) INTO animals_count
  FROM public.animals
  WHERE cabaña_id = cabana_uuid
    AND LOWER(COALESCE(status, 'activo')) NOT IN ('vendido', 'muerto');

  trial_days := GREATEST(0, EXTRACT(DAY FROM sub_record.trial_end_date - NOW())::INTEGER);
  is_trial_active_val := sub_record.is_trial_active AND trial_days > 0;
  is_read_only_val := NOT is_trial_active_val AND NOT sub_record.is_active;

  RETURN QUERY SELECT
    sub_record.plan::text,
    is_trial_active_val,
    trial_days,
    sub_record.is_active,
    sub_record.max_animals,
    animals_count,
    animals_count < sub_record.max_animals AND NOT is_read_only_val,
    is_read_only_val,
    effective_sub_end,
    sub_record.trial_end_date;
END;
$$;