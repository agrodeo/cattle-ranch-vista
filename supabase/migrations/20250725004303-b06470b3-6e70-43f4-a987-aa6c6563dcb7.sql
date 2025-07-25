-- Add 'avanzado' to the subscription_plan enum
ALTER TYPE subscription_plan ADD VALUE 'avanzado';

-- Update the update_subscription_plan function to handle the new 'avanzado' plan
CREATE OR REPLACE FUNCTION public.update_subscription_plan(cabana_uuid uuid, new_plan subscription_plan)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    WHEN 'avanzado' THEN
      new_max_animals := 600;
      new_max_users := 4;
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
$function$;