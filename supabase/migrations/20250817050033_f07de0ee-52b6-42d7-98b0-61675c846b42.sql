-- Fix the get_current_user_cabana_id function to work with users table
CREATE OR REPLACE FUNCTION public.get_current_user_cabana_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Try to get cabaña_id from users table first (for internal users)
  SELECT cabaña_id 
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$function$;

-- Also ensure has_role function exists and works properly
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$;