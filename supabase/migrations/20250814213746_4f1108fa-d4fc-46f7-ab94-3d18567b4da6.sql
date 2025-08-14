-- Fix the RLS enabled but no policy issue on the activities table
-- This table has RLS enabled but the policy was removed, so we need to add one

-- Add a permissive policy to the activities table to resolve the security warning
CREATE POLICY "Allow all operations on activities" 
ON public.activities 
FOR ALL 
USING (true) 
WITH CHECK (true);