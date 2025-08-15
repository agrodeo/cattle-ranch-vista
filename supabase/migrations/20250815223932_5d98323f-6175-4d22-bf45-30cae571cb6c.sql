-- Add cabaña_id to profiles table to support hybrid authentication
ALTER TABLE public.profiles ADD COLUMN cabaña_id uuid REFERENCES public.cabañas(id);

-- Create an index for better performance
CREATE INDEX idx_profiles_cabana_id ON public.profiles(cabaña_id);

-- Create a function to link existing Supabase Auth users with the first available cabaña
CREATE OR REPLACE FUNCTION public.assign_cabana_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If cabaña_id is not set, assign the first available cabaña
  IF NEW.cabaña_id IS NULL THEN
    SELECT id INTO NEW.cabaña_id FROM public.cabañas LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign cabaña on profile creation
CREATE TRIGGER assign_cabana_on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_cabana_to_profile();