-- Fix the INSERT policy for cabañas to allow initial creation
-- The issue is that get_current_user_cabana_id() fails when user doesn't have a cabaña yet

DROP POLICY IF EXISTS "Users can create cabañas" ON public.cabañas;

-- Create a policy that allows authenticated users to create their first cabaña
CREATE POLICY "Authenticated users can create cabañas" ON public.cabañas
FOR INSERT 
TO authenticated
WITH CHECK (true);