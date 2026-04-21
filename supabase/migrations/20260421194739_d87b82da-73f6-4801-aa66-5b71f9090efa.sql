CREATE OR REPLACE FUNCTION public.protect_trial_used()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.trial_used = true AND NEW.trial_used = false THEN
    RAISE EXCEPTION 'trial_used cannot be reverted to false (cabaña %)', OLD."cabaña_id";
  END IF;
  RETURN NEW;
END;
$$;