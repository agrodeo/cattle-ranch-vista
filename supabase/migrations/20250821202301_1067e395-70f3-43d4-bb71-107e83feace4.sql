-- Fix 2: Add owner column to cabañas and update policies
-- Add owner column to link cabañas to users
ALTER TABLE public.cabañas ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Drop the current cabañas policies that depend on get_current_user_cabana_id 
-- (which creates circular dependency during signup)
DROP POLICY IF EXISTS "Authenticated users can create cabañas" ON public.cabañas;
DROP POLICY IF EXISTS "Users can delete their own cabaña" ON public.cabañas;
DROP POLICY IF EXISTS "Users can update their own cabaña" ON public.cabañas;
DROP POLICY IF EXISTS "Users can view their own cabaña" ON public.cabañas;

-- Create proper owner-based policies for cabañas
CREATE POLICY "Users can create cabañas" ON public.cabañas
FOR INSERT 
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view their own cabaña" ON public.cabañas
FOR SELECT 
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can update their own cabaña" ON public.cabañas
FOR UPDATE 
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own cabaña" ON public.cabañas
FOR DELETE 
TO authenticated
USING (owner_id = auth.uid());

-- Add trigger to auto-set owner_id if not provided
CREATE OR REPLACE FUNCTION public.set_cabana_owner()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_cabana_owner ON public.cabañas;
CREATE TRIGGER trg_set_cabana_owner
  BEFORE INSERT ON public.cabañas
  FOR EACH ROW EXECUTE FUNCTION public.set_cabana_owner();