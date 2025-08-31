-- Fix critical security vulnerability in sistema_credenciales table
-- Restrict access to system administrators only

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Solo usuario autenticado puede ver credenciales" ON public.sistema_credenciales;

-- Create a secure policy that only allows system administrators to access credentials
CREATE POLICY "Only system administrators can access sistema credentials"
ON public.sistema_credenciales
FOR SELECT
USING (
  -- Only allow access if user has admin role
  has_role(auth.uid(), 'admin'::app_role)
);

-- Also restrict other operations to admins only for extra security
CREATE POLICY "Only system administrators can manage sistema credentials"
ON public.sistema_credenciales
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);