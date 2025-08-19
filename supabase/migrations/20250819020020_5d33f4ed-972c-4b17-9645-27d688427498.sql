-- Phase 1: Database Schema Updates for Supabase Auth Migration

-- 1. Extend profiles table with fields from users table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hire_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_internal_profile boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Add unique constraint on employee_code if not null
ALTER TABLE public.profiles ADD CONSTRAINT profiles_employee_code_unique UNIQUE (employee_code);

-- 2. Update get_current_user_cabana_id function to use profiles instead of users
CREATE OR REPLACE FUNCTION public.get_current_user_cabana_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT cabaña_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$function$;

-- 3. Update user roles to link to profiles instead of users table
-- First, add a constraint to link user_roles to profiles
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Update has_role function to work with auth.uid()
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$;

-- 5. Create helper function to get user cabana info from profiles
CREATE OR REPLACE FUNCTION public.get_user_cabana_info(user_uuid uuid)
RETURNS TABLE(cabana_id uuid, cabana_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.id, c.name
  FROM public.profiles p
  JOIN public.cabañas c ON p.cabaña_id = c.id
  WHERE p.user_id = user_uuid
  LIMIT 1;
$function$;

-- 6. Update RLS policies that use users table to use profiles table instead

-- Update animals RLS policy
DROP POLICY IF EXISTS "Allow all operations on animals" ON public.animals;
CREATE POLICY "Users can manage animals in their cabaña" ON public.animals
FOR ALL 
USING (
  cabaña_id = (
    SELECT cabaña_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  cabaña_id = (
    SELECT cabaña_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Update activities RLS policy
DROP POLICY IF EXISTS "soloacrivities" ON public.activities;
CREATE POLICY "Users can manage activities for their cabaña animals" ON public.activities
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.animals a
    JOIN public.profiles p ON p.cabaña_id = a.cabaña_id
    WHERE a.id = activities.animal_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.animals a
    JOIN public.profiles p ON p.cabaña_id = a.cabaña_id
    WHERE a.id = activities.animal_id
    AND p.user_id = auth.uid()
  )
);

-- Update eventos RLS policies
DROP POLICY IF EXISTS "Users can insert eventos for their cabana" ON public.eventos;
DROP POLICY IF EXISTS "Users can view eventos for their cabana" ON public.eventos;

CREATE POLICY "Users can insert eventos for their cabaña" ON public.eventos
FOR INSERT
WITH CHECK (
  cabaña_id = (
    SELECT cabaña_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view eventos for their cabaña" ON public.eventos
FOR SELECT
USING (
  cabaña_id = (
    SELECT cabaña_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Update vacunas_historial RLS policies
DROP POLICY IF EXISTS "Users can insert vacunas_historial for their cabana" ON public.vacunas_historial;
DROP POLICY IF EXISTS "Users can view vacunas_historial for their cabana" ON public.vacunas_historial;

CREATE POLICY "Users can insert vacunas_historial for their cabaña" ON public.vacunas_historial
FOR INSERT
WITH CHECK (
  cabaña_id = (
    SELECT cabaña_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view vacunas_historial for their cabaña" ON public.vacunas_historial
FOR SELECT
USING (
  cabaña_id = (
    SELECT cabaña_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Update preñeces RLS policies
DROP POLICY IF EXISTS "Users can insert preñeces for their cabana" ON public.preñeces;
DROP POLICY IF EXISTS "Users can update preñeces for their cabana" ON public.preñeces;
DROP POLICY IF EXISTS "Users can view preñeces for their cabana" ON public.preñeces;

CREATE POLICY "Users can insert preñeces for their cabaña" ON public.preñeces
FOR INSERT
WITH CHECK (
  cabaña_id = (
    SELECT cabaña_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update preñeces for their cabaña" ON public.preñeces
FOR UPDATE
USING (
  cabaña_id = (
    SELECT cabaña_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view preñeces for their cabaña" ON public.preñeces
FOR SELECT
USING (
  cabaña_id = (
    SELECT cabaña_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- 7. Create data migration function to copy users to profiles
CREATE OR REPLACE FUNCTION public.migrate_users_to_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
  new_auth_user_id UUID;
  user_password TEXT;
BEGIN
  -- Loop through all users in the users table
  FOR user_record IN 
    SELECT * FROM public.users 
    WHERE is_internal_profile = true 
    AND id NOT IN (SELECT user_id FROM public.profiles)
  LOOP
    -- Get the user's password
    SELECT password_text INTO user_password 
    FROM public.user_passwords 
    WHERE user_id = user_record.id;
    
    -- Create a temporary email if user doesn't have one
    IF user_record.email IS NULL THEN
      user_record.email := user_record.username || '@temp-migration.local';
    END IF;
    
    -- Insert into profiles table (will be updated when Supabase auth user is created)
    INSERT INTO public.profiles (
      user_id,
      cabaña_id,
      full_name,
      email,
      employee_code,
      position,
      department,
      hire_date,
      last_login,
      is_active,
      is_internal_profile,
      username,
      created_at,
      updated_at
    ) VALUES (
      user_record.id, -- Temporary, will be updated when auth user is created
      user_record.cabaña_id,
      user_record.full_name,
      user_record.email,
      user_record.employee_code,
      user_record.position,
      user_record.department,
      user_record.hire_date,
      user_record.last_login,
      user_record.is_active,
      user_record.is_internal_profile,
      user_record.username,
      user_record.created_at,
      NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Copy user roles
    INSERT INTO public.user_roles (user_id, role, created_at)
    SELECT user_record.id, ur.role, ur.created_at
    FROM public.user_roles ur
    WHERE ur.user_id = user_record.id
    ON CONFLICT (user_id, role) DO NOTHING;
    
  END LOOP;
  
  RAISE NOTICE 'Migration preparation completed. Users data copied to profiles table.';
END;
$function$;