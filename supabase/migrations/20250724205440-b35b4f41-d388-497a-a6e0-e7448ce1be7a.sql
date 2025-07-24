-- Fix search path for functions
CREATE OR REPLACE FUNCTION public.get_subscription_status(cabana_uuid uuid)
RETURNS TABLE(
  plan subscription_plan,
  is_trial_active boolean,
  trial_days_remaining integer,
  is_subscription_active boolean,
  max_animals integer,
  max_users integer,
  current_animals_count bigint,
  current_users_count bigint,
  can_add_animals boolean,
  can_add_users boolean,
  is_read_only boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  subscription_record RECORD;
  animals_count bigint;
  users_count bigint;
  trial_remaining integer;
  is_expired boolean;
BEGIN
  -- Get subscription record
  SELECT * INTO subscription_record
  FROM public.subscriptions
  WHERE cabaña_id = cabana_uuid;
  
  -- If no subscription exists, create default one
  IF subscription_record IS NULL THEN
    INSERT INTO public.subscriptions (cabaña_id, plan, max_animals, max_users)
    VALUES (cabana_uuid, 'free', 50, 2)
    RETURNING * INTO subscription_record;
  END IF;
  
  -- Count active animals (exclude sold and dead)
  SELECT COUNT(*) INTO animals_count
  FROM public.animals
  WHERE cabaña_id = cabana_uuid
  AND (status IS NULL OR status NOT IN ('vendido', 'muerto'));
  
  -- Count active users
  SELECT COUNT(*) INTO users_count
  FROM public.users
  WHERE cabaña_id = cabana_uuid
  AND is_active = true;
  
  -- Calculate trial days remaining
  trial_remaining := GREATEST(0, EXTRACT(DAY FROM subscription_record.trial_end_date - now())::integer);
  
  -- Check if trial/subscription is expired
  is_expired := (subscription_record.is_trial_active AND now() > subscription_record.trial_end_date) 
               OR (NOT subscription_record.is_trial_active AND (subscription_record.subscription_end_date IS NULL OR now() > subscription_record.subscription_end_date));
  
  RETURN QUERY SELECT
    subscription_record.plan,
    subscription_record.is_trial_active AND now() <= subscription_record.trial_end_date,
    trial_remaining,
    subscription_record.is_active AND NOT is_expired,
    subscription_record.max_animals,
    subscription_record.max_users,
    animals_count,
    users_count,
    animals_count < subscription_record.max_animals AND NOT is_expired,
    users_count < subscription_record.max_users AND NOT is_expired,
    is_expired AND NOT subscription_record.is_trial_active;
END;
$$;

-- Fix search path for update subscription plan function
CREATE OR REPLACE FUNCTION public.update_subscription_plan(cabana_uuid uuid, new_plan subscription_plan)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_max_animals integer;
  new_max_users integer;
BEGIN
  -- Set limits based on plan
  CASE new_plan
    WHEN 'free' THEN
      new_max_animals := 50;
      new_max_users := 2;
    WHEN 'personal' THEN
      new_max_animals := 200;
      new_max_users := 3;
    WHEN 'productor' THEN
      new_max_animals := 1000;
      new_max_users := 5;
    WHEN 'cabana' THEN
      new_max_animals := 5000;
      new_max_users := 15;
    WHEN 'corporativo' THEN
      new_max_animals := 999999;
      new_max_users := 999999;
  END CASE;
  
  -- Update subscription
  UPDATE public.subscriptions 
  SET 
    plan = new_plan,
    max_animals = new_max_animals,
    max_users = new_max_users,
    updated_at = now()
  WHERE cabaña_id = cabana_uuid;
  
  -- If no subscription exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (cabaña_id, plan, max_animals, max_users)
    VALUES (cabana_uuid, new_plan, new_max_animals, new_max_users);
  END IF;
END;
$$;

-- Fix search path for activate subscription function
CREATE OR REPLACE FUNCTION public.activate_subscription(
  cabana_uuid uuid, 
  plan_name subscription_plan, 
  duration_months integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update subscription to active
  UPDATE public.subscriptions 
  SET 
    plan = plan_name,
    is_trial_active = false,
    subscription_start_date = now(),
    subscription_end_date = now() + (duration_months || ' months')::interval,
    is_active = true,
    updated_at = now()
  WHERE cabaña_id = cabana_uuid;
  
  -- Update plan limits
  PERFORM public.update_subscription_plan(cabana_uuid, plan_name);
END;
$$;