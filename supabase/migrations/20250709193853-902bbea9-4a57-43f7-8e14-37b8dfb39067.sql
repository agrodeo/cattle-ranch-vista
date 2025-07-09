-- Create a default cabaña if none exists
INSERT INTO public.cabañas (name, location) 
VALUES ('Cabaña Principal', 'Ubicación Principal')
ON CONFLICT DO NOTHING;

-- Create a user record for the current authenticated user
-- This will be linked to the default cabaña
INSERT INTO public.users (id, cabaña_id, full_name)
SELECT 
    auth.uid(),
    (SELECT id FROM public.cabañas LIMIT 1),
    COALESCE(auth.jwt() ->> 'user_metadata' ->> 'full_name', 'Usuario')
WHERE auth.uid() IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    cabaña_id = EXCLUDED.cabaña_id,
    full_name = EXCLUDED.full_name;