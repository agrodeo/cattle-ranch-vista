-- Fix user_passwords foreign key constraints to reference public.users instead of auth.users

-- Remove the existing foreign key constraint that references auth.users
ALTER TABLE public.user_passwords DROP CONSTRAINT IF EXISTS user_passwords_user_id_fkey;

-- Remove the existing foreign key constraint for created_by that references auth.users
ALTER TABLE public.user_passwords DROP CONSTRAINT IF EXISTS user_passwords_created_by_fkey;

-- Add new foreign key constraint from user_passwords.user_id to public.users.id
ALTER TABLE public.user_passwords 
ADD CONSTRAINT user_passwords_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add new foreign key constraint from user_passwords.created_by to public.users.id
ALTER TABLE public.user_passwords 
ADD CONSTRAINT user_passwords_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;