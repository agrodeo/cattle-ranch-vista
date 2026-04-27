REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_modify_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_users(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_active_in_cabana(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_role_in(public.app_role[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_modify_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_active_in_cabana(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role_in(public.app_role[]) TO authenticated;