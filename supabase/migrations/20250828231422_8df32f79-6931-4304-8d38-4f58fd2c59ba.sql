-- Drop existing function and recreate without user limits
DROP FUNCTION IF EXISTS public.get_subscription_status(uuid);

-- Create new subscription status function without user limits
CREATE OR REPLACE FUNCTION public.get_subscription_status(cabana_uuid uuid)
 RETURNS TABLE(
   plan subscription_plan,
   is_trial_active boolean,
   trial_days_remaining integer,
   is_subscription_active boolean,
   max_animals integer,
   current_animals_count integer,
   can_add_animals boolean,
   is_read_only boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  sub_record RECORD;
  animals_count INTEGER;
  trial_days INTEGER;
  is_trial_active_val BOOLEAN;
  is_read_only_val BOOLEAN;
BEGIN
  -- Get subscription info
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE cabaña_id = cabana_uuid;
  
  -- If no subscription, create default
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (cabaña_id, plan, max_animals)
    VALUES (cabana_uuid, 'free', 50)
    RETURNING * INTO sub_record;
  END IF;
  
  -- Count current animals
  SELECT COUNT(*) INTO animals_count
  FROM public.animals
  WHERE cabaña_id = cabana_uuid
    AND status != 'vendido'
    AND status != 'muerto';
  
  -- Calculate trial status
  trial_days := GREATEST(0, EXTRACT(DAY FROM sub_record.trial_end_date - NOW())::INTEGER);
  is_trial_active_val := sub_record.is_trial_active AND trial_days > 0;
  
  -- Determine read-only status
  is_read_only_val := NOT is_trial_active_val AND NOT sub_record.is_active;
  
  RETURN QUERY SELECT
    sub_record.plan,
    is_trial_active_val,
    trial_days,
    sub_record.is_active,
    sub_record.max_animals,
    animals_count,
    animals_count < sub_record.max_animals AND NOT is_read_only_val,
    is_read_only_val;
END;
$function$;