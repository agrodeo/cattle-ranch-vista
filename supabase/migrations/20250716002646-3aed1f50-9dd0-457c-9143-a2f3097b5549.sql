-- Disable email confirmation for new users by updating auth settings
-- This requires manual configuration in Supabase Dashboard under Authentication > Settings
-- Set "Enable email confirmations" to OFF
-- Set "Enable phone confirmations" to OFF

-- Create a table to store user passwords for admin access
CREATE TABLE public.user_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on user_passwords
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage all passwords
CREATE POLICY "Admins can manage all passwords"
ON public.user_passwords
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Policy for users to view their own password
CREATE POLICY "Users can view their own password"
ON public.user_passwords
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy for users to update their own password
CREATE POLICY "Users can update their own password"
ON public.user_passwords
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Create trigger for updating timestamps
CREATE TRIGGER update_user_passwords_updated_at
  BEFORE UPDATE ON public.user_passwords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();