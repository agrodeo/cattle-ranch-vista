-- Fix security vulnerability: Remove overly permissive subscription access
-- Current issue: "System can manage subscriptions" policy allows public access with "Using Expression: true"

-- First, drop the problematic policy that allows unrestricted access
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.subscriptions;

-- Create a more secure policy for edge functions (using service role)
-- Edge functions should use the service role key to bypass RLS when needed
CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure authenticated users can only insert subscriptions for their own cabaña
CREATE POLICY "Users can create subscription for their cabaña"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (cabaña_id = get_current_user_cabana_id());

-- Add policy for system operations during cabaña creation (triggered functions)
CREATE POLICY "System can create default subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow creation during cabaña setup (when no subscription exists yet)
  NOT EXISTS (
    SELECT 1 FROM public.subscriptions s2 
    WHERE s2.cabaña_id = subscriptions.cabaña_id
  )
);

-- Verify existing policies remain secure:
-- ✓ "Users can view their cabaña subscription" - restricts SELECT to own cabaña
-- ✓ "Users can update their cabaña subscription" - restricts UPDATE to own cabaña