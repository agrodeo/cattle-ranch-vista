-- Remove employee authentication tables and functions
-- This simplifies the system to use only standard Supabase auth

-- Drop employee authentication function
DROP FUNCTION IF EXISTS public.verify_user_login(text, text);

-- Drop user management tables
DROP TABLE IF EXISTS public.user_passwords CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE; 
DROP TABLE IF EXISTS public.users CASCADE;

-- Remove employee-related functions
DROP FUNCTION IF EXISTS public.generate_employee_code();
DROP FUNCTION IF EXISTS public.create_company_with_owner(text, text, text, text);
DROP FUNCTION IF EXISTS public.create_company_with_owner(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_company_with_owner(text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_internal_user_cabana_info(uuid);
DROP FUNCTION IF EXISTS public.get_user_role_by_id(uuid);

-- Keep the standard Supabase auth with profiles table for user data
-- All authentication will now go through standard email/password only