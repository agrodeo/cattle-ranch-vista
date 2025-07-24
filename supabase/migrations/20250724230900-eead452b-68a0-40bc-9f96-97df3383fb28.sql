-- Remove the foreign key constraint from public.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Update the default value for the id column to use gen_random_uuid()
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();