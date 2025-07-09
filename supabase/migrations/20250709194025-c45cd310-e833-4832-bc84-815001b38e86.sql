-- Create trigger to automatically create user records on signup
DROP TRIGGER IF EXISTS on_auth_user_created_with_cabana ON auth.users;
CREATE TRIGGER on_auth_user_created_with_cabana
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_cabana();

-- For existing users, we need to create their user record manually
-- This will create a user record for anyone who is currently authenticated
DO $$
DECLARE
    user_record RECORD;
    default_cabana_id UUID;
BEGIN
    -- Get the default cabaña ID
    SELECT id INTO default_cabana_id FROM public.cabañas LIMIT 1;
    
    -- Create user records for all existing auth users who don't have a public.users record
    FOR user_record IN 
        SELECT au.id, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        INSERT INTO public.users (id, cabaña_id, full_name)
        VALUES (
            user_record.id,
            default_cabana_id,
            COALESCE(user_record.raw_user_meta_data ->> 'full_name', 'Usuario')
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;