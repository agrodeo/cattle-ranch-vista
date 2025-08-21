-- Fix cabañas RLS policies - remove duplicate INSERT policies and ensure proper access
-- Drop duplicate INSERT policy
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear cabañas" ON public.cabañas;

-- The existing "Authenticated users can create cabañas" policy should handle INSERT correctly
-- Let's verify it exists and has the right permissions
DROP POLICY IF EXISTS "Authenticated users can create cabañas" ON public.cabañas;

-- Create a single, clear INSERT policy for cabañas
CREATE POLICY "Users can create cabañas" ON public.cabañas
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Ensure users can read their own cabaña info
DROP POLICY IF EXISTS "Users can view their own cabaña" ON public.cabañas;
CREATE POLICY "Users can view their own cabaña" ON public.cabañas
FOR SELECT 
TO authenticated
USING (id = get_current_user_cabana_id());