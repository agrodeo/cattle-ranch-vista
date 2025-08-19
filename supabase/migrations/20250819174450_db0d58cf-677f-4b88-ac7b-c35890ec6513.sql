-- CORRECIÓN URGENTE DE SEGURIDAD: Agregar políticas RLS faltantes para cabañas

-- 1. Política para que usuarios autenticados puedan crear cabañas
CREATE POLICY "Usuarios autenticados pueden crear cabañas" 
ON public.cabañas 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 2. Política para que usuarios puedan ver su propia cabaña
CREATE POLICY "Usuarios pueden ver su cabaña" 
ON public.cabañas 
FOR SELECT 
TO authenticated
USING (
  id = COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
    (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
  )
);

-- 3. Política para que admins puedan actualizar su cabaña
CREATE POLICY "Admins pueden actualizar su cabaña" 
ON public.cabañas 
FOR UPDATE 
TO authenticated
USING (
  id = COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
    (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
  ) AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  id = COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
    (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
  ) AND has_role(auth.uid(), 'admin')
);

-- 4. Función de auditoría para logging de acceso de seguridad
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Habilitar RLS en audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- 6. Política para que solo admins vean logs de auditoría
CREATE POLICY "Solo admins pueden ver logs de auditoría" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 7. Función para log de auditoría
CREATE OR REPLACE FUNCTION public.log_security_event(
  _action text,
  _table_name text,
  _record_id uuid DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, details
  ) VALUES (
    auth.uid(), _action, _table_name, _record_id, _details
  );
END;
$$;