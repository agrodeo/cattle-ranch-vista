-- Insert the missing user record to fix the "no se pudo guardar el animal" error
INSERT INTO public.users (id, cabaña_id, full_name, email, is_internal_profile, is_active)
VALUES (
  '95424479-f8c8-441e-a775-fa6738224032',
  '26a4288b-0ab5-4abf-b88c-25de5dca0273',
  'Fausto Sicilia',
  'user@example.com',
  false,
  true
)
ON CONFLICT (id) DO UPDATE SET
  cabaña_id = EXCLUDED.cabaña_id,
  full_name = EXCLUDED.full_name,
  updated_at = now();