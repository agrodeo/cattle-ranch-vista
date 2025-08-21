-- Fix RLS policies for cabañas table to allow creation during signup
-- The current policy is conflicting and preventing cabaña creation

-- Drop the conflicting policy
DROP POLICY IF EXISTS "Users can manage their cabaña location" ON public.cabañas;

-- Create separate policies for better control
CREATE POLICY "Authenticated users can create cabañas"
  ON public.cabañas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own cabaña"
  ON public.cabañas FOR SELECT
  USING (id = get_current_user_cabana_id());

CREATE POLICY "Users can update their own cabaña"
  ON public.cabañas FOR UPDATE
  USING (id = get_current_user_cabana_id())
  WITH CHECK (id = get_current_user_cabana_id());

CREATE POLICY "Users can delete their own cabaña" 
  ON public.cabañas FOR DELETE
  USING (id = get_current_user_cabana_id());