-- 1. Restrict profile PII to the owner and ranch managers
DROP POLICY IF EXISTS "Allow viewing cabaña profiles" ON public.profiles;

-- 2. Restrict staff records to the owner and ranch managers
DROP POLICY IF EXISTS "Users can view their own record and same cabaña users" ON public.users;
CREATE POLICY "Users can view own record or managers view cabana staff"
ON public.users FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR (public.can_manage_users(auth.uid()) AND "cabaña_id" = public.get_current_user_cabana_id())
);

-- 3. Non-sensitive member directory for assignment pickers / name display
CREATE OR REPLACE FUNCTION public.get_cabana_member_directory()
RETURNS TABLE (user_id uuid, full_name text, member_position text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.position, p.is_active
  FROM public.profiles p
  WHERE p."cabaña_id" IS NOT NULL
    AND p."cabaña_id" = public.get_current_user_cabana_id();
$$;

REVOKE ALL ON FUNCTION public.get_cabana_member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cabana_member_directory() TO authenticated;

-- 4. Achievements must belong to the caller's own cabaña
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert their own achievements"
ON public.user_achievements FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND "cabaña_id" = public.get_current_user_cabana_id());

DROP POLICY IF EXISTS "Users can update their own achievements" ON public.user_achievements;
CREATE POLICY "Users can update their own achievements"
ON public.user_achievements FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND "cabaña_id" = public.get_current_user_cabana_id())
WITH CHECK (auth.uid() = user_id AND "cabaña_id" = public.get_current_user_cabana_id());

-- 5. Trial ledger is server-side only (no client reads of billing identifiers)
DROP POLICY IF EXISTS "Users can read their own trial-consumed record" ON public.trial_consumed_identities;

-- 6. No anonymous execution of SECURITY DEFINER functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, PUBLIC', r.sig);
  END LOOP;
END $$;

-- 7. Signed-in users cannot execute trigger functions or privileged internal routines
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND (
        p.prorettype = 'trigger'::regtype
        OR p.proname IN (
          'hash_password','get_sistema_credenciales','prepare_user_migration',
          'create_company_with_owner','activate_subscription','is_valid_password_reset_token',
          'migrate_existing_offspring_to_outcomes','migrate_historical_weighings',
          'backfill_animal_weights_v2','log_security_event','add_default_death_causes_to_cabana'
        )
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_cabana_member_directory() TO authenticated;