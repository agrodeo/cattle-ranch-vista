-- Fix critical security vulnerability: Replace overly permissive RLS policies on users table
-- Current policies allow any authenticated user to access all user data across all organizations
-- New policies restrict access to users within the same cabaña (organization) only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Sistema autenticado puede ver perfiles internos" ON public.users;
DROP POLICY IF EXISTS "Sistema autenticado puede actualizar perfiles internos" ON public.users;
DROP POLICY IF EXISTS "Sistema autenticado puede crear perfiles internos" ON public.users;
DROP POLICY IF EXISTS "Sistema autenticado puede eliminar perfiles internos" ON public.users;

-- Create secure policies that restrict access to same cabaña only
CREATE POLICY "Users can view users in their cabaña"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.cabaña_id = users.cabaña_id
  )
);

CREATE POLICY "Users can update users in their cabaña"
ON public.users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.cabaña_id = users.cabaña_id
  )
);

CREATE POLICY "Admins can create users in their cabaña"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.id = auth.uid()
    AND u.cabaña_id = users.cabaña_id
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can delete users in their cabaña"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.id = auth.uid()
    AND u.cabaña_id = users.cabaña_id
    AND ur.role = 'admin'
  )
);