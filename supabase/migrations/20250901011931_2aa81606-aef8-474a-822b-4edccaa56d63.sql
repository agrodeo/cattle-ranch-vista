-- Enforce subscription limits at database level with RLS policies

-- Function to check if user can add animals
CREATE OR REPLACE FUNCTION can_add_animals(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_cabana_id uuid;
  sub_status RECORD;
BEGIN
  -- Get user's cabaña
  SELECT cabaña_id INTO user_cabana_id 
  FROM public.profiles 
  WHERE user_id = user_uuid;
  
  IF user_cabana_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get subscription status
  SELECT * INTO sub_status
  FROM public.get_subscription_status(user_cabana_id)
  LIMIT 1;
  
  -- Allow if not in read-only mode and can add animals
  RETURN NOT COALESCE(sub_status.is_read_only, true) AND COALESCE(sub_status.can_add_animals, false);
END;
$$;

-- Function to check if user can modify data (not read-only)
CREATE OR REPLACE FUNCTION can_modify_data(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_cabana_id uuid;
  sub_status RECORD;
BEGIN
  -- Get user's cabaña
  SELECT cabaña_id INTO user_cabana_id 
  FROM public.profiles 
  WHERE user_id = user_uuid;
  
  IF user_cabana_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get subscription status
  SELECT * INTO sub_status
  FROM public.get_subscription_status(user_cabana_id)
  LIMIT 1;
  
  -- Allow if not in read-only mode
  RETURN NOT COALESCE(sub_status.is_read_only, true);
END;
$$;

-- Update animals table policies to enforce subscription limits
DROP POLICY IF EXISTS "Admins and employees can manage animals for their cabaña" ON public.animals;
CREATE POLICY "Admins and employees can manage animals for their cabaña" ON public.animals
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_add_animals(auth.uid())
);

DROP POLICY IF EXISTS "Admins and employees can update animals for their cabaña" ON public.animals;
CREATE POLICY "Admins and employees can update animals for their cabaña" ON public.animals
FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_modify_data(auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_modify_data(auth.uid())
);

-- Update corrales table policies
DROP POLICY IF EXISTS "Admins can manage corrales for their cabaña" ON public.corrales;
CREATE POLICY "Admins can manage corrales for their cabaña" ON public.corrales
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_modify_data(auth.uid())
);

DROP POLICY IF EXISTS "Admins can update corrales for their cabaña" ON public.corrales;
CREATE POLICY "Admins can update corrales for their cabaña" ON public.corrales
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_modify_data(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_modify_data(auth.uid())
);

-- Update eventos table policies
DROP POLICY IF EXISTS "Admins and employees can manage events for their cabaña" ON public.eventos;
CREATE POLICY "Admins and employees can manage events for their cabaña" ON public.eventos
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_modify_data(auth.uid())
);

DROP POLICY IF EXISTS "Admins and employees can update events for their cabaña" ON public.eventos;
CREATE POLICY "Admins and employees can update events for their cabaña" ON public.eventos
FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_modify_data(auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_modify_data(auth.uid())
);

-- Update finances table policies
DROP POLICY IF EXISTS "Admins y empleados pueden crear finanzas en su cabaña" ON public.finances;
CREATE POLICY "Admins y empleados pueden crear finanzas en su cabaña" ON public.finances
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role))
  AND ("cabaña_id" = get_current_user_cabana_id())
  AND can_modify_data(auth.uid())
);