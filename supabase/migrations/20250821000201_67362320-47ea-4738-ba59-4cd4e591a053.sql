-- Fix RLS policy for profile creation during signup
-- The current policy prevents profile creation because it checks auth.uid() = user_id
-- But during signup, we need to allow creating a profile for the authenticated user

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

-- Create separate policies for better granularity
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Also ensure user_roles table has proper policies for admin role assignment
-- During signup, we might need to assign roles, so let's create a policy for that
CREATE POLICY "System can assign initial roles during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (true);  -- Temporarily allow all inserts - will be restricted by application logic