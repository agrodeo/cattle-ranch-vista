CREATE OR REPLACE FUNCTION public.ensure_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW."cabaña_id" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.user_id,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM public."cabañas" c
          WHERE c.id = NEW."cabaña_id"
            AND c.owner_id = NEW.user_id
        ) THEN 'admin'::public.app_role
        ELSE 'employee'::public.app_role
      END
    )
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_ensure_profile_role ON public.profiles;

CREATE TRIGGER trg_profiles_ensure_profile_role
AFTER INSERT OR UPDATE OF "cabaña_id" ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_profile_role();

INSERT INTO public.user_roles (user_id, role)
SELECT
  p.user_id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public."cabañas" c
      WHERE c.id = p."cabaña_id"
        AND c.owner_id = p.user_id
    ) THEN 'admin'::public.app_role
    ELSE 'employee'::public.app_role
  END
FROM public.profiles p
WHERE p.user_id IS NOT NULL
  AND p."cabaña_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.user_id
  )
ON CONFLICT (user_id, role) DO NOTHING;