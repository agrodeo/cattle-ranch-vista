
-- ============================================================
-- 1. FIX: subscription plan bypass - drop the UPDATE policy
-- ============================================================
DROP POLICY IF EXISTS "Users can update their cabaña subscription" ON public.subscriptions;

-- ============================================================
-- 2. FIX: user_roles unrestricted INSERT - restrict to service_role
-- ============================================================
DROP POLICY IF EXISTS "System can assign initial roles during signup" ON public.user_roles;

CREATE POLICY "Service role can assign roles"
ON public.user_roles FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================
-- 3. FIX: users table unrestricted INSERT
-- ============================================================
DROP POLICY IF EXISTS "System can insert users" ON public.users;

CREATE POLICY "Service role can insert users"
ON public.users FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================
-- 4. FIX: search_path on all public functions missing it
-- ============================================================
ALTER FUNCTION public.calculate_ai_success_rate(integer, uuid, text, uuid) SET search_path = public;
ALTER FUNCTION public.calculate_animal_vaccination_coverage(uuid) SET search_path = public;
ALTER FUNCTION public.calculate_daily_gain(numeric, numeric, integer) SET search_path = public;
ALTER FUNCTION public.calculate_gestational_days_at_loss() SET search_path = public;
ALTER FUNCTION public.check_consanguinity(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.check_overdue_pregnancies() SET search_path = public;
ALTER FUNCTION public.check_reproductive_alerts() SET search_path = public;
ALTER FUNCTION public.classify_weighing_type(date, date, text) SET search_path = public;
ALTER FUNCTION public.complete_pregnancy_on_birth() SET search_path = public;
ALTER FUNCTION public.get_animal_weight_history(uuid) SET search_path = public;
ALTER FUNCTION public.get_current_entitlements(uuid) SET search_path = public;
ALTER FUNCTION public.get_herd_weight_summary(uuid, date, date) SET search_path = public;
ALTER FUNCTION public.get_sistema_credenciales() SET search_path = public;
ALTER FUNCTION public.get_vaccination_alerts_for_animal(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.get_vaccination_compliance(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user_with_cabana() SET search_path = public;
ALTER FUNCTION public.increment_achievement_share(uuid) SET search_path = public;
ALTER FUNCTION public.list_finance_reports(uuid, date, date) SET search_path = public;
ALTER FUNCTION public.mark_pregnancy_failed(uuid, text) SET search_path = public;
ALTER FUNCTION public.migrate_existing_reproductive_data() SET search_path = public;
ALTER FUNCTION public.migrate_historical_weighings() SET search_path = public;
ALTER FUNCTION public.prepare_user_migration() SET search_path = public;
ALTER FUNCTION public.process_weighing_after_insert() SET search_path = public;
ALTER FUNCTION public.record_animal_vaccination(uuid, uuid, date, text, text, text) SET search_path = public;
ALTER FUNCTION public.rpc_corral_complete_kpis(uuid) SET search_path = public;
ALTER FUNCTION public.sync_animal_weights_to_history() SET search_path = public;
ALTER FUNCTION public.touch_location_updated_at() SET search_path = public;
ALTER FUNCTION public.track_corral_movement() SET search_path = public;
ALTER FUNCTION public.update_animal_pregnancy_from_pregneces() SET search_path = public;
ALTER FUNCTION public.update_animal_pregnancy_from_tacto() SET search_path = public;
ALTER FUNCTION public.update_reproductive_kpis_on_event() SET search_path = public;
ALTER FUNCTION public.update_reproductive_metrics(uuid, integer, integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.update_reproductive_metrics_trigger() SET search_path = public;
ALTER FUNCTION public.verify_sistema_login(text, text) SET search_path = public;
