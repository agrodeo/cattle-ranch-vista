-- Remove the problematic RLS policy I created
DROP POLICY IF EXISTS "owner can read/write own ranch" ON public.cabañas;

-- The existing policies already handle cabañas access correctly:
-- "Authenticated users can create cabañas" allows INSERT
-- "Users can view their own cabaña" handles SELECT via get_current_user_cabana_id()
-- "Users can update their own cabaña" handles UPDATE via get_current_user_cabana_id()
-- "Users can delete their own cabaña" handles DELETE via get_current_user_cabana_id()

-- Make sure profiles RLS is correct (remove my policy and use simpler one)
DROP POLICY IF EXISTS "self profile" ON public.profiles;

CREATE POLICY "Users can manage their own profile" ON public.profiles
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);