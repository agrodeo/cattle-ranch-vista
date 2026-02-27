-- Restrict update_subscription_plan so only service_role can call it.
-- Revoke EXECUTE from public and authenticated roles, grant only to service_role.
REVOKE EXECUTE ON FUNCTION public.update_subscription_plan(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_subscription_plan(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_subscription_plan(uuid, text) FROM anon;

-- Only service_role (edge functions) can call this
GRANT EXECUTE ON FUNCTION public.update_subscription_plan(uuid, text) TO service_role;