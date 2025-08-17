-- Create function to get cabaña info for internal users
CREATE OR REPLACE FUNCTION public.get_internal_user_cabana_info(user_uuid uuid)
 RETURNS TABLE(cabana_id uuid, cabana_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.name
  FROM public.users u
  JOIN public.cabañas c ON u.cabaña_id = c.id
  WHERE u.id = user_uuid
  LIMIT 1;
$function$;