-- Clean up users with NULL usernames and fix password migration
DELETE FROM public.user_passwords 
WHERE user_id IN (
  SELECT id FROM public.users 
  WHERE username IS NULL OR TRIM(username) = ''
);

DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT id FROM public.users 
  WHERE username IS NULL OR TRIM(username) = ''
);

DELETE FROM public.users 
WHERE username IS NULL OR TRIM(username) = '';

-- Force update existing passwords to be ready for migration
UPDATE public.user_passwords 
SET password_text = CASE 
  WHEN password_text NOT LIKE '$2%' AND password_text NOT LIKE 'bcrypt_placeholder:%' 
  THEN password_text
  ELSE password_text
END
WHERE user_id IN (
  SELECT id FROM public.users 
  WHERE username IN ('juancin', 'lamancha', 'lamanchona')
);