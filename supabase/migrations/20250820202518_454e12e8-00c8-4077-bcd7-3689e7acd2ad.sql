-- Hash employee passwords directly using pgcrypto
-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash the specific employee passwords 
UPDATE public.user_passwords 
SET password_text = crypt(password_text, gen_salt('bf', 12))
WHERE user_id IN (
  SELECT id FROM public.users 
  WHERE username IN ('juancin', 'lamancha', 'lamanchona')
  AND is_internal_profile = true
)
AND password_text NOT LIKE '$2%'  -- Only hash if not already hashed
AND password_text IS NOT NULL
AND TRIM(password_text) != '';