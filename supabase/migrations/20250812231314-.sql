-- Enable RLS and set secure CRUD policies for finances by cabana and role; add performance index

-- Ensure RLS is enabled
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;

-- Drop existing select-only policy if present
DROP POLICY IF EXISTS solofinances ON public.finances;
DROP POLICY IF EXISTS "Usuarios pueden ver finanzas de su cabaña" ON public.finances;
DROP POLICY IF EXISTS "Admins y empleados pueden crear finanzas en su cabaña" ON public.finances;
DROP POLICY IF EXISTS "Admins y empleados pueden actualizar finanzas en su cabaña" ON public.finances;
DROP POLICY IF EXISTS "Admins y empleados pueden eliminar finanzas en su cabaña" ON public.finances;

-- SELECT: Users can view finances in their cabana
CREATE POLICY "Usuarios pueden ver finanzas de su cabaña"
ON public.finances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u."cabaña_id" = finances."cabaña_id"
  )
);

-- INSERT: Admins and employees can create finances in their cabana
CREATE POLICY "Admins y empleados pueden crear finanzas en su cabaña"
ON public.finances
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.id = auth.uid()
      AND u."cabaña_id" = finances."cabaña_id"
      AND ur.role IN ('admin'::app_role, 'employee'::app_role)
  )
);

-- UPDATE: Admins and employees can update finances in their cabana
CREATE POLICY "Admins y empleados pueden actualizar finanzas en su cabaña"
ON public.finances
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.id = auth.uid()
      AND u."cabaña_id" = finances."cabaña_id"
      AND ur.role IN ('admin'::app_role, 'employee'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.id = auth.uid()
      AND u."cabaña_id" = finances."cabaña_id"
      AND ur.role IN ('admin'::app_role, 'employee'::app_role)
  )
);

-- DELETE: Admins and employees can delete finances in their cabana
CREATE POLICY "Admins y empleados pueden eliminar finanzas en su cabaña"
ON public.finances
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.id = auth.uid()
      AND u."cabaña_id" = finances."cabaña_id"
      AND ur.role IN ('admin'::app_role, 'employee'::app_role)
  )
);

-- Performance index for common queries
CREATE INDEX IF NOT EXISTS idx_finances_cabana_date ON public.finances("cabaña_id", "date");