
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own cabaña" ON cabañas;

-- Create a new policy that allows users to view cabañas they're members of
CREATE POLICY "Users can view their cabaña"
ON cabañas
FOR SELECT
TO authenticated
USING (
  -- User is the owner OR user's profile is linked to this cabaña
  owner_id = auth.uid() 
  OR 
  id IN (
    SELECT cabaña_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);
