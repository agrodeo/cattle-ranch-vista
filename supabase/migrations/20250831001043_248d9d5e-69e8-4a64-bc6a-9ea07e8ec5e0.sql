-- Fix critical security vulnerability in bulls table
-- Restrict access to bulls data by cabaña to prevent competitor data theft

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Users can view bulls" ON public.bulls;

-- Create a secure policy that only allows users to view bulls from their own cabaña
CREATE POLICY "Users can view bulls from their cabaña only"
ON public.bulls
FOR SELECT
USING (
  -- Only allow access to bulls from user's own cabaña
  "cabaña_id" = get_current_user_cabana_id()
);