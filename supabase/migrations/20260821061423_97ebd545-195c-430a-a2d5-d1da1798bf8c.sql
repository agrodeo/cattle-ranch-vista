REVOKE EXECUTE ON FUNCTION public.set_trial_start() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_trial_start() TO service_role;