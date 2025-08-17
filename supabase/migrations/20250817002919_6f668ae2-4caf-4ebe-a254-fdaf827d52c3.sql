-- MIGRACIÓN COMPLETA A SUPABASE AUTH
-- Paso 1: Migrar datos de cabaña_id de users a profiles donde falte
UPDATE public.profiles 
SET cabaña_id = (
  SELECT u.cabaña_id 
  FROM public.users u 
  WHERE u.id = profiles.user_id
)
WHERE cabaña_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = profiles.user_id AND u.cabaña_id IS NOT NULL
  );

-- Paso 2: Crear función auxiliar para obtener cabaña_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_cabana_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cabaña_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Paso 3: Crear función auxiliar para verificar roles sin recursión
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Paso 4: RECREAR todas las políticas RLS problemáticas usando las nuevas funciones

-- Políticas para la tabla users (simplificadas)
DROP POLICY IF EXISTS "Admins can create users in their cabaña" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users in their cabaña" ON public.users;
DROP POLICY IF EXISTS "Users can update users in their cabaña" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their cabaña" ON public.users;

CREATE POLICY "Admins can create users in their cabaña" ON public.users
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) 
  AND cabaña_id = public.get_current_user_cabana_id()
);

CREATE POLICY "Admins can delete users in their cabaña" ON public.users
FOR DELETE 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) 
  AND cabaña_id = public.get_current_user_cabana_id()
);

CREATE POLICY "Users can update users in their cabaña" ON public.users
FOR UPDATE 
TO authenticated
USING (cabaña_id = public.get_current_user_cabana_id())
WITH CHECK (cabaña_id = public.get_current_user_cabana_id());

CREATE POLICY "Users can view users in their cabaña" ON public.users
FOR SELECT 
TO authenticated
USING (cabaña_id = public.get_current_user_cabana_id());

-- Políticas para finanzas (corregidas)
DROP POLICY IF EXISTS "Admins y empleados pueden crear finanzas en su cabaña" ON public.finances;
DROP POLICY IF EXISTS "Admins y empleados pueden actualizar finanzas en su cabaña" ON public.finances;
DROP POLICY IF EXISTS "Admins y empleados pueden eliminar finanzas en su cabaña" ON public.finances;
DROP POLICY IF EXISTS "Usuarios pueden ver finanzas de su cabaña" ON public.finances;

CREATE POLICY "Admins y empleados pueden crear finanzas en su cabaña" ON public.finances
FOR INSERT 
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'employee'::app_role))
  AND cabaña_id = public.get_current_user_cabana_id()
);

CREATE POLICY "Admins y empleados pueden actualizar finanzas en su cabaña" ON public.finances
FOR UPDATE 
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'employee'::app_role))
  AND cabaña_id = public.get_current_user_cabana_id()
)
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'employee'::app_role))
  AND cabaña_id = public.get_current_user_cabana_id()
);

CREATE POLICY "Admins y empleados pueden eliminar finanzas en su cabaña" ON public.finances
FOR DELETE 
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'employee'::app_role))
  AND cabaña_id = public.get_current_user_cabana_id()
);

CREATE POLICY "Usuarios pueden ver finanzas de su cabaña" ON public.finances
FOR SELECT 
TO authenticated
USING (cabaña_id = public.get_current_user_cabana_id());

-- Políticas para finance_categories (corregidas)
DROP POLICY IF EXISTS "Users can view finance categories (system or own cabana)" ON public.finance_categories;
DROP POLICY IF EXISTS "Users can insert finance categories for their cabana" ON public.finance_categories;
DROP POLICY IF EXISTS "Users can update finance categories for their cabana" ON public.finance_categories;
DROP POLICY IF EXISTS "Users can delete finance categories for their cabana" ON public.finance_categories;

CREATE POLICY "Users can view finance categories (system or own cabana)" ON public.finance_categories
FOR SELECT 
TO authenticated
USING (
  cabaña_id IS NULL OR cabaña_id = public.get_current_user_cabana_id()
);

CREATE POLICY "Users can insert finance categories for their cabana" ON public.finance_categories
FOR INSERT 
TO authenticated
WITH CHECK (
  cabaña_id = public.get_current_user_cabana_id() AND is_system = false
);

CREATE POLICY "Users can update finance categories for their cabana" ON public.finance_categories
FOR UPDATE 
TO authenticated
USING (
  cabaña_id = public.get_current_user_cabana_id() AND is_system = false
)
WITH CHECK (
  cabaña_id = public.get_current_user_cabana_id() AND is_system = false
);

CREATE POLICY "Users can delete finance categories for their cabana" ON public.finance_categories
FOR DELETE 
TO authenticated
USING (
  cabaña_id = public.get_current_user_cabana_id() AND is_system = false
);

-- Políticas para finance_recurring (corregidas)
DROP POLICY IF EXISTS "Users can view recurring for their cabana" ON public.finance_recurring;
DROP POLICY IF EXISTS "Users can insert recurring for their cabana" ON public.finance_recurring;
DROP POLICY IF EXISTS "Users can update recurring for their cabana" ON public.finance_recurring;
DROP POLICY IF EXISTS "Users can delete recurring for their cabana" ON public.finance_recurring;

CREATE POLICY "Users can view recurring for their cabana" ON public.finance_recurring
FOR SELECT 
TO authenticated
USING (cabaña_id = public.get_current_user_cabana_id());

CREATE POLICY "Users can insert recurring for their cabana" ON public.finance_recurring
FOR INSERT 
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'employee'::app_role))
  AND cabaña_id = public.get_current_user_cabana_id()
);

CREATE POLICY "Users can update recurring for their cabana" ON public.finance_recurring
FOR UPDATE 
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'employee'::app_role))
  AND cabaña_id = public.get_current_user_cabana_id()
)
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'employee'::app_role))
  AND cabaña_id = public.get_current_user_cabana_id()
);

CREATE POLICY "Users can delete recurring for their cabana" ON public.finance_recurring
FOR DELETE 
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'employee'::app_role))
  AND cabaña_id = public.get_current_user_cabana_id()
);

-- Políticas para subscriptions (corregidas)
DROP POLICY IF EXISTS "Users can view their cabaña subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their cabaña subscription" ON public.subscriptions;

CREATE POLICY "Users can view their cabaña subscription" ON public.subscriptions
FOR SELECT 
TO authenticated
USING (cabaña_id = public.get_current_user_cabana_id());

CREATE POLICY "Users can update their cabaña subscription" ON public.subscriptions
FOR UPDATE 
TO authenticated
USING (cabaña_id = public.get_current_user_cabana_id())
WITH CHECK (cabaña_id = public.get_current_user_cabana_id());

-- Actualizar funciones que usan public.users para usar profiles
CREATE OR REPLACE FUNCTION public.get_user_cabana_info(user_uuid uuid)
RETURNS TABLE(cabana_id uuid, cabana_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name
  FROM public.profiles p
  JOIN public.cabañas c ON p.cabaña_id = c.id
  WHERE p.user_id = user_uuid
  LIMIT 1;
$$;