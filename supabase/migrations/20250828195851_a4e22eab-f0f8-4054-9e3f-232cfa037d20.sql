-- Assign admin role to the user to fix permission errors
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES (
  '95424479-f8c8-441e-a775-fa6738224032',
  'admin',
  '95424479-f8c8-441e-a775-fa6738224032'
)
ON CONFLICT (user_id, role) DO NOTHING;