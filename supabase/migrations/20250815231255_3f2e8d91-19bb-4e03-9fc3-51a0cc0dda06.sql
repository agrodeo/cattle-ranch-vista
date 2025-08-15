-- Fix infinite recursion in RLS policies by creating security definer functions
-- and updating the users table policies

-- Create function to check user role without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's cabaña without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_cabana()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT cabaña_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1
$$;

-- Drop existing problematic policies on users table
DROP POLICY IF EXISTS "Users can view users in their cabaña" ON public.users;
DROP POLICY IF EXISTS "Users can update users in their cabaña" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users in their cabaña" ON public.users;
DROP POLICY IF EXISTS "Admins can create users in their cabaña" ON public.users;

-- Create new non-recursive policies for users table
CREATE POLICY "Users can view users in their cabaña"
ON public.users
FOR SELECT
TO authenticated
USING (
  cabaña_id = (
    SELECT u.cabaña_id 
    FROM public.users u 
    WHERE u.id = auth.uid()
  )
);

CREATE POLICY "Users can update users in their cabaña"
ON public.users
FOR UPDATE
TO authenticated
USING (
  cabaña_id = (
    SELECT u.cabaña_id 
    FROM public.users u 
    WHERE u.id = auth.uid()
  )
);

CREATE POLICY "Admins can create users in their cabaña"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') AND
  cabaña_id = (
    SELECT u.cabaña_id 
    FROM public.users u 
    WHERE u.id = auth.uid()
  )
);

CREATE POLICY "Admins can delete users in their cabaña"
ON public.users
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') AND
  cabaña_id = (
    SELECT u.cabaña_id 
    FROM public.users u 
    WHERE u.id = auth.uid()
  )
);