-- Phase 1: Database Schema Updates (Fixed approach)

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

-- 2. Update get_current_user_cabana_id function to work with both auth types temporarily
CREATE OR REPLACE FUNCTION public.get_current_user_cabana_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- First try to get from profiles (Supabase auth users)
  SELECT COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
    (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
  );
$function$;

-- 3. Update get_user_cabana_info to work with both auth types
CREATE OR REPLACE FUNCTION public.get_user_cabana_info(user_uuid uuid)
RETURNS TABLE(cabana_id uuid, cabana_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- First try profiles, then users table
  SELECT c.id, c.name
  FROM public.cabañas c
  WHERE c.id = COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = user_uuid),
    (SELECT cabaña_id FROM public.users WHERE id = user_uuid)
  )
  LIMIT 1;
$function$;

-- 4. Update RLS policies to work with both auth types temporarily

-- Update animals RLS policy
DROP POLICY IF EXISTS "Allow all operations on animals" ON public.animals;
DROP POLICY IF EXISTS "Users can manage animals in their cabaña" ON public.animals;
CREATE POLICY "Users can manage animals in their cabaña" ON public.animals
FOR ALL 
USING (
  cabaña_id = COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
    (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  cabaña_id = COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
    (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
  )
);

-- Update activities RLS policy
DROP POLICY IF EXISTS "Allow all operations on activities" ON public.activities;
DROP POLICY IF EXISTS "soloacrivities" ON public.activities;
DROP POLICY IF EXISTS "Users can manage activities for their cabaña animals" ON public.activities;
CREATE POLICY "Users can manage activities for their cabaña animals" ON public.activities
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.animals a
    WHERE a.id = activities.animal_id
    AND a.cabaña_id = COALESCE(
      (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
      (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.animals a
    WHERE a.id = activities.animal_id
    AND a.cabaña_id = COALESCE(
      (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
      (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
    )
  )
);

-- Update eventos RLS policies
DROP POLICY IF EXISTS "Users can insert eventos for their cabana" ON public.eventos;
DROP POLICY IF EXISTS "Users can view eventos for their cabana" ON public.eventos;
DROP POLICY IF EXISTS "Users can insert eventos for their cabaña" ON public.eventos;
DROP POLICY IF EXISTS "Users can view eventos for their cabaña" ON public.eventos;

CREATE POLICY "Users can insert eventos for their cabaña" ON public.eventos
FOR INSERT
WITH CHECK (
  cabaña_id = COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
    (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can view eventos for their cabaña" ON public.eventos
FOR SELECT
USING (
  cabaña_id = COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
    (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
  )
);

-- 5. Create a data preparation function
CREATE OR REPLACE FUNCTION public.prepare_user_migration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
BEGIN
  -- Copy existing users to profiles table preparation
  FOR user_record IN 
    SELECT * FROM public.users 
    WHERE is_internal_profile = true
  LOOP
    -- Create a temporary email if user doesn't have one
    IF user_record.email IS NULL THEN
      UPDATE public.users 
      SET email = user_record.username || '@temp-migration.local'
      WHERE id = user_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'User migration preparation completed.';
END;
$function$;