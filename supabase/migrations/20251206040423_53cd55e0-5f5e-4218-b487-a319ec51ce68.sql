-- Backfill missing admin roles for cabaña owners
INSERT INTO public.user_roles (user_id, role)
SELECT c.owner_id, 'admin'::app_role
FROM cabañas c
WHERE c.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = c.owner_id
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Create trigger function to auto-assign admin role when user creates a cabaña
CREATE OR REPLACE FUNCTION public.assign_admin_role_on_cabana_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign if owner_id is set and they don't already have admin role
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.owner_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on cabañas table
DROP TRIGGER IF EXISTS trigger_assign_admin_on_cabana_creation ON cabañas;
CREATE TRIGGER trigger_assign_admin_on_cabana_creation
  AFTER INSERT ON cabañas
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role_on_cabana_creation();