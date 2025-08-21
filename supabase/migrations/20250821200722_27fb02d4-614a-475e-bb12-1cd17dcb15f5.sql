-- Ensure app_role enum exists
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'employee', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure has_role function exists
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;