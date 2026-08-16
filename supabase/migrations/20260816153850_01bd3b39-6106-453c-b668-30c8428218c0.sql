CREATE OR REPLACE FUNCTION public.get_subscription_status(cabana_uuid uuid)
 RETURNS TABLE(plan text, subscription_status text, trial_used boolean, is_trial_active boolean, trial_days_remaining integer, is_subscription_active boolean, max_animals integer, current_animals_count integer, can_add_animals boolean, is_read_only boolean, subscription_end_date timestamp with time zone, trial_end_date timestamp with time zone, signup_trial_active boolean, signup_trial_days_remaining integer, signup_trial_end_date timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub_record   RECORD;
  billing_sub  RECORD;
  animals_count INTEGER;
  trial_days   INTEGER;
  trial_active BOOLEAN;
  effective_sub_end timestamptz;
  resolved_status text;
  read_only BOOLEAN;
  signup_started timestamptz;
  signup_end timestamptz;
  signup_active BOOLEAN := false;
  signup_days INTEGER := 0;
  effective_max INTEGER;
  effective_can_add BOOLEAN;
  free_limit INTEGER := 50;
BEGIN
  SELECT * INTO sub_record
    FROM public.subscriptions
   WHERE "cabaña_id" = cabana_uuid;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (
      "cabaña_id", plan, max_animals,
      is_trial_active, trial_start_date, trial_end_date,
      trial_used, subscription_status, is_active
    ) VALUES (
      cabana_uuid, 'free', 50,
      false, NULL, NULL,
      false, 'none', true
    )
    ON CONFLICT ("cabaña_id") DO NOTHING;

    SELECT * INTO sub_record
      FROM public.subscriptions
     WHERE "cabaña_id" = cabana_uuid;
  END IF;

  effective_sub_end := sub_record.subscription_end_date;

  IF effective_sub_end IS NULL THEN
    SELECT * INTO billing_sub
      FROM public.billing_subscriptions
     WHERE cabana_id = cabana_uuid
       AND status = 'active'
     ORDER BY current_period_end DESC NULLS LAST
     LIMIT 1;
    IF FOUND THEN
      effective_sub_end := billing_sub.current_period_end;
    END IF;
  END IF;

  trial_days := GREATEST(
    0,
    COALESCE(CEIL(EXTRACT(EPOCH FROM (sub_record.trial_end_date - now())) / 86400)::INTEGER, 0)
  );
  trial_active := COALESCE(sub_record.is_trial_active, false)
                  AND sub_record.trial_end_date IS NOT NULL
                  AND sub_record.trial_end_date > now();

  resolved_status := CASE
    WHEN sub_record.subscription_status = 'active' AND sub_record.is_active THEN 'active'
    WHEN trial_active THEN 'trial'
    WHEN sub_record.subscription_status IN ('past_due','canceled','expired') THEN sub_record.subscription_status
    WHEN sub_record.trial_used = true AND NOT sub_record.is_active THEN 'expired'
    ELSE 'none'
  END;

  -- 7-day automatic signup trial (server time, never client time)
  SELECT c.trial_started_at INTO signup_started
    FROM public."cabañas" c
   WHERE c.id = cabana_uuid;

  IF signup_started IS NOT NULL THEN
    signup_end := signup_started + interval '7 days';
    IF signup_end > now() AND resolved_status NOT IN ('active','trial') THEN
      signup_active := true;
      signup_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (signup_end - now())) / 86400)::INTEGER);
    END IF;
  END IF;

  SELECT COUNT(*) INTO animals_count
    FROM public.animals
   WHERE "cabaña_id" = cabana_uuid
     AND LOWER(COALESCE(status, 'activo')) NOT IN ('vendido','muerto');

  IF signup_active THEN
    -- Full, frictionless access during the 7-day signup trial
    read_only := false;
    effective_max := 999999;
    effective_can_add := true;
  ELSIF resolved_status IN ('active','trial') THEN
    read_only := false;
    effective_max := sub_record.max_animals;
    effective_can_add := animals_count < sub_record.max_animals;
  ELSE
    -- No plan and signup trial over => fall back to the FREE tier.
    -- Up to 50 active animals the app stays fully usable; above that it locks.
    effective_max := free_limit;
    read_only := animals_count > free_limit;
    effective_can_add := animals_count < free_limit;
  END IF;

  RETURN QUERY SELECT
    sub_record.plan::text,
    resolved_status,
    sub_record.trial_used,
    trial_active,
    trial_days,
    sub_record.is_active,
    effective_max,
    animals_count,
    effective_can_add,
    read_only,
    effective_sub_end,
    sub_record.trial_end_date,
    signup_active,
    signup_days,
    signup_end;
END;
$function$;