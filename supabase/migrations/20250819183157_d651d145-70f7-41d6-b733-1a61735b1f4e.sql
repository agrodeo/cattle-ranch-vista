-- Remove the custom password reset tokens table as we're switching to native Supabase Auth
DROP TABLE IF EXISTS public.password_reset_tokens;