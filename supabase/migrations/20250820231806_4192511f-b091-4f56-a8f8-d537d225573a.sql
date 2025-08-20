-- REBUILD LOCATION + VACCINE RULES FROM ZERO

-- 1) Add location to ranch/company table
ALTER TABLE public.cabañas
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- 2) Ensure profiles table exists for user location mirroring
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code TEXT,
  province_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cabaña_id UUID,
  hire_date DATE,
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_internal_profile BOOLEAN DEFAULT TRUE,
  department TEXT,
  username TEXT,
  full_name TEXT,
  email TEXT,
  employee_code TEXT,
  position TEXT
);

-- 3) Location update trigger
CREATE OR REPLACE FUNCTION public.touch_location_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.location_updated_at := NOW();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_touch_location ON public.cabañas;
CREATE TRIGGER trg_touch_location
BEFORE UPDATE ON public.cabañas
FOR EACH ROW EXECUTE FUNCTION public.touch_location_updated_at();

-- 4) RLS policies for cabañas location management
ALTER TABLE public.cabañas ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read/write their own ranch location
CREATE POLICY "Users can manage their cabaña location" 
ON public.cabañas
FOR ALL
USING (id = get_current_user_cabana_id())
WITH CHECK (id = get_current_user_cabana_id());

-- 5) Update profiles RLS 
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies to recreate them properly
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles; 
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can manage their own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);