-- Drop the duplicate function that uses subscription_plan enum type
DROP FUNCTION IF EXISTS public.update_subscription_plan(uuid, subscription_plan);

-- Recreate with ONLY text parameter (no enum)
CREATE OR REPLACE FUNCTION public.update_subscription_plan(cabana_uuid uuid, new_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      new_max_animals := 125;
      new_max_users := 3;
    WHEN 'avanzado' THEN
      new_max_animals := 250;
      new_max_users := 4;
    WHEN 'productor' THEN
      new_max_animals := 500;
      new_max_users := 5;
    WHEN 'cabana' THEN
      new_max_animals := 1000;
      new_max_users := 15;
    WHEN 'corporativo' THEN
      new_max_animals := 999999;
      new_max_users := 999999;
    ELSE
      new_max_animals := 50;
      new_max_users := 2;
  END CASE;
  
  -- Update subscription
  UPDATE public.subscriptions 
  SET 
    plan = new_plan::subscription_plan,
    max_animals = new_max_animals,
    max_users = new_max_users,
    updated_at = now()
  WHERE cabaña_id = cabana_uuid;
  
  -- If no subscription exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (cabaña_id, plan, max_animals, max_users)
    VALUES (cabana_uuid, new_plan::subscription_plan, new_max_animals, new_max_users);
  END IF;
END;
$$;