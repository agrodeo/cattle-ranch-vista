-- Create a default cabaña if none exists
INSERT INTO public.cabañas (name, location) 
VALUES ('Cabaña Principal', 'Ubicación Principal')
ON CONFLICT DO NOTHING;

-- Create a trigger function to automatically create user records
CREATE OR REPLACE FUNCTION public.handle_new_user_with_cabana()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create user record with the first available cabaña
  INSERT INTO public.users (id, cabaña_id, full_name)
  VALUES (
    NEW.id,
    (SELECT id FROM public.cabañas LIMIT 1),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario')
  )
  ON CONFLICT (id) DO UPDATE SET
    cabaña_id = EXCLUDED.cabaña_id,
    full_name = EXCLUDED.full_name;
  
  RETURN NEW;
END;
$$;