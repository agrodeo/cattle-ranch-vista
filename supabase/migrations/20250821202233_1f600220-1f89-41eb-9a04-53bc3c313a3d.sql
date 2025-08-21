-- Fix 1: Remove conflicting profiles policies that cause infinite recursion
-- The issue is we have multiple overlapping policies and one references profiles from within profiles

-- Drop all current profiles policies
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile and same cabaña users" ON public.profiles;

-- Create simple, non-recursive profiles policies
CREATE POLICY "Allow users to manage their own profile" ON public.profiles
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow viewing profiles in the same cabaña without recursion
CREATE POLICY "Allow viewing cabaña profiles" ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR 
  cabaña_id IN (
    SELECT u.cabaña_id FROM public.users u WHERE u.id = auth.uid()
  )
);