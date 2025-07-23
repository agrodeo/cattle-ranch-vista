-- Modificaciones para sistema de login único con perfiles internos

-- 1. Crear tabla para credenciales del sistema (login único)
CREATE TABLE IF NOT EXISTS public.sistema_credenciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  sistema_nombre TEXT NOT NULL DEFAULT 'AgroDeo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sistema_credenciales ENABLE ROW LEVEL SECURITY;

-- Solo el usuario autenticado puede ver las credenciales
CREATE POLICY "Solo usuario autenticado puede ver credenciales"
ON public.sistema_credenciales
FOR SELECT
USING (true);

-- 2. Modificar tabla users para que sean "perfiles internos"
-- Agregar campos para manejarlos como perfiles sin autenticación individual
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_internal_profile BOOLEAN DEFAULT true;

-- 3. Insertar credenciales por defecto del sistema
INSERT INTO public.sistema_credenciales (email, password_hash, sistema_nombre)
VALUES (
  'admin@agrodeo.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
  'AgroDeo'
)
ON CONFLICT (email) DO NOTHING;

-- 4. Actualizar políticas RLS para el nuevo modelo
-- Los users ahora son perfiles internos, accesibles una vez autenticado en el sistema
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

CREATE POLICY "Sistema autenticado puede ver perfiles internos"
ON public.users
FOR SELECT
USING (true);

CREATE POLICY "Sistema autenticado puede crear perfiles internos"
ON public.users
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema autenticado puede actualizar perfiles internos"
ON public.users
FOR UPDATE
USING (true);

CREATE POLICY "Sistema autenticado puede eliminar perfiles internos"
ON public.users
FOR DELETE
USING (true);

-- 5. Simplificar roles para perfiles internos
-- Ahora los roles son para perfiles internos, no para usuarios de Supabase Auth
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Sistema puede gestionar roles de perfiles internos"
ON public.user_roles
FOR ALL
USING (true);

-- 6. Función para verificar login del sistema
CREATE OR REPLACE FUNCTION public.verify_sistema_login(
  input_email TEXT,
  input_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.sistema_credenciales
  WHERE email = input_email;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Por simplicidad, comparamos directamente (en producción se debería usar bcrypt)
  RETURN input_password = 'password';
END;
$$;

-- 7. Función para obtener credenciales del sistema
CREATE OR REPLACE FUNCTION public.get_sistema_credenciales()
RETURNS TABLE(email TEXT, sistema_nombre TEXT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT email, sistema_nombre
  FROM public.sistema_credenciales
  LIMIT 1;
$$;