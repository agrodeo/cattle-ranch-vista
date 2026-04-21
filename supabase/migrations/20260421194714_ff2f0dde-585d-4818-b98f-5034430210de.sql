
-- =========================================================================
-- 1. Extend `subscriptions` with trial-once tracking fields
-- =========================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text;

-- Constrain subscription_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_status_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_status_check
      CHECK (subscription_status IN ('none','trial','active','past_due','canceled','expired'));
  END IF;
END $$;

-- Make new ranches default to NO auto-trial (existing rows untouched)
ALTER TABLE public.subscriptions ALTER COLUMN is_trial_active SET DEFAULT false;
ALTER TABLE public.subscriptions ALTER COLUMN trial_start_date  DROP DEFAULT;
ALTER TABLE public.subscriptions ALTER COLUMN trial_end_date    DROP DEFAULT;

-- Trial_used is irreversible: once true, never back to false
CREATE OR REPLACE FUNCTION public.protect_trial_used()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.trial_used = true AND NEW.trial_used = false THEN
    RAISE EXCEPTION 'trial_used cannot be reverted to false (cabaña %)', OLD."cabaña_id";
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_trial_used ON public.subscriptions;
CREATE TRIGGER trg_protect_trial_used
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.protect_trial_used();

-- Backfill: anyone who ever had a trial active or already has a paid plan
-- is marked trial_used so they can never claim a fresh one.
UPDATE public.subscriptions
   SET trial_used = true,
       trial_consumed_at = COALESCE(trial_consumed_at, trial_start_date, now())
 WHERE trial_used = false
   AND (is_trial_active = true OR plan <> 'free' OR subscription_start_date IS NOT NULL);

-- Backfill subscription_status from existing flags
UPDATE public.subscriptions
   SET subscription_status = CASE
     WHEN plan <> 'free' AND is_active = true THEN 'active'
     WHEN is_trial_active = true AND trial_end_date > now() THEN 'trial'
     WHEN is_trial_active = true AND trial_end_date <= now() THEN 'expired'
     WHEN trial_used = true THEN 'expired'
     ELSE 'none'
   END
 WHERE subscription_status = 'none';

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_customer
  ON public.subscriptions (paddle_customer_id)
  WHERE paddle_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_subscription
  ON public.subscriptions (paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

-- =========================================================================
-- 2. Global ledger of identities that have already consumed a trial
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.trial_consumed_identities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text,
  paddle_customer_id text,
  cabana_id       uuid,
  consumed_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trial_consumed_identities_at_least_one
    CHECK (email IS NOT NULL OR paddle_customer_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trial_consumed_email
  ON public.trial_consumed_identities (lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_trial_consumed_paddle_customer
  ON public.trial_consumed_identities (paddle_customer_id)
  WHERE paddle_customer_id IS NOT NULL;

ALTER TABLE public.trial_consumed_identities ENABLE ROW LEVEL SECURITY;

-- Authenticated users can check whether their OWN email has consumed a trial
DROP POLICY IF EXISTS "Users can read their own trial-consumed record"
  ON public.trial_consumed_identities;
CREATE POLICY "Users can read their own trial-consumed record"
  ON public.trial_consumed_identities
  FOR SELECT TO authenticated
  USING (lower(email) = lower((auth.jwt() ->> 'email')));

-- Only service role / SECURITY DEFINER functions can write
DROP POLICY IF EXISTS "Service role manages trial ledger"
  ON public.trial_consumed_identities;
CREATE POLICY "Service role manages trial ledger"
  ON public.trial_consumed_identities
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =========================================================================
-- 3. Helper: has this identity already consumed a trial?
-- =========================================================================

CREATE OR REPLACE FUNCTION public.is_trial_consumed(
  p_email text DEFAULT NULL,
  p_paddle_customer_id text DEFAULT NULL,
  p_cabana_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cabaña-level
  IF p_cabana_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscriptions
     WHERE "cabaña_id" = p_cabana_id AND trial_used = true
  ) THEN
    RETURN true;
  END IF;

  -- Email-level (global)
  IF p_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.trial_consumed_identities
     WHERE lower(email) = lower(p_email)
  ) THEN
    RETURN true;
  END IF;

  -- Paddle customer-level (global)
  IF p_paddle_customer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.trial_consumed_identities
     WHERE paddle_customer_id = p_paddle_customer_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_trial_consumed(text, text, uuid)
  TO authenticated, service_role;

-- =========================================================================
-- 4. Atomically grant a 14-day trial (only if eligible)
--    Returns the resulting trial_end_date, or NULL if not granted.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.start_trial_for_cabana(
  p_cabana_id uuid,
  p_plan text,
  p_email text,
  p_paddle_customer_id text DEFAULT NULL,
  p_paddle_subscription_id text DEFAULT NULL,
  p_trial_days integer DEFAULT 14
) RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now    timestamptz := now();
  v_end    timestamptz := now() + make_interval(days => p_trial_days);
  v_consumed boolean;
BEGIN
  -- Block second trials
  v_consumed := public.is_trial_consumed(p_email, p_paddle_customer_id, p_cabana_id);
  IF v_consumed THEN
    -- Don't grant trial; just record the paid-subscription IDs and bail.
    UPDATE public.subscriptions
       SET paddle_customer_id     = COALESCE(p_paddle_customer_id, paddle_customer_id),
           paddle_subscription_id = COALESCE(p_paddle_subscription_id, paddle_subscription_id),
           updated_at = v_now
     WHERE "cabaña_id" = p_cabana_id;
    RETURN NULL;
  END IF;

  -- Grant trial (and bump plan tier so limits apply)
  UPDATE public.subscriptions
     SET plan                   = p_plan::subscription_plan,
         is_trial_active        = true,
         trial_start_date       = v_now,
         trial_end_date         = v_end,
         trial_used             = true,
         trial_consumed_at      = v_now,
         subscription_status    = 'trial',
         paddle_customer_id     = COALESCE(p_paddle_customer_id, paddle_customer_id),
         paddle_subscription_id = COALESCE(p_paddle_subscription_id, paddle_subscription_id),
         updated_at             = v_now
   WHERE "cabaña_id" = p_cabana_id;

  -- If no row existed yet, create it
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (
      "cabaña_id", plan, is_trial_active, trial_start_date, trial_end_date,
      trial_used, trial_consumed_at, subscription_status,
      paddle_customer_id, paddle_subscription_id
    ) VALUES (
      p_cabana_id, p_plan::subscription_plan, true, v_now, v_end,
      true, v_now, 'trial',
      p_paddle_customer_id, p_paddle_subscription_id
    );
  END IF;

  -- Persist the global ledger (idempotent inserts)
  IF p_email IS NOT NULL THEN
    INSERT INTO public.trial_consumed_identities (email, cabana_id)
    VALUES (p_email, p_cabana_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF p_paddle_customer_id IS NOT NULL THEN
    INSERT INTO public.trial_consumed_identities (paddle_customer_id, cabana_id)
    VALUES (p_paddle_customer_id, p_cabana_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_end;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_trial_for_cabana(uuid, text, text, text, text, integer)
  TO service_role;

-- =========================================================================
-- 5. Rewrite get_subscription_status — never auto-creates a trial
-- =========================================================================

DROP FUNCTION IF EXISTS public.get_subscription_status(uuid);

CREATE OR REPLACE FUNCTION public.get_subscription_status(cabana_uuid uuid)
RETURNS TABLE(
  plan text,
  subscription_status text,
  trial_used boolean,
  is_trial_active boolean,
  trial_days_remaining integer,
  is_subscription_active boolean,
  max_animals integer,
  current_animals_count integer,
  can_add_animals boolean,
  is_read_only boolean,
  subscription_end_date timestamptz,
  trial_end_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record   RECORD;
  billing_sub  RECORD;
  animals_count INTEGER;
  trial_days   INTEGER;
  trial_active BOOLEAN;
  effective_sub_end timestamptz;
  resolved_status text;
  read_only BOOLEAN;
BEGIN
  SELECT * INTO sub_record
    FROM public.subscriptions
   WHERE "cabaña_id" = cabana_uuid;

  IF NOT FOUND THEN
    -- Auto-create a FREE row with no trial
    INSERT INTO public.subscriptions (
      "cabaña_id", plan, max_animals,
      is_trial_active, trial_start_date, trial_end_date,
      trial_used, subscription_status
    ) VALUES (
      cabana_uuid, 'free', 50,
      false, NULL, NULL,
      false, 'none'
    )
    RETURNING * INTO sub_record;
  END IF;

  -- Pull period end from billing_subscriptions if local row lacks it
  effective_sub_end := sub_record.subscription_end_date;
  IF effective_sub_end IS NULL THEN
    SELECT current_period_end INTO billing_sub
      FROM public.billing_subscriptions
     WHERE cabana_id = cabana_uuid AND status IN ('active','trialing')
     ORDER BY created_at DESC
     LIMIT 1;
    IF FOUND THEN
      effective_sub_end := billing_sub.current_period_end;
    END IF;
  END IF;

  trial_days := GREATEST(
    0,
    COALESCE(EXTRACT(DAY FROM sub_record.trial_end_date - now())::INTEGER, 0)
  );
  trial_active := COALESCE(sub_record.is_trial_active, false)
                  AND sub_record.trial_end_date IS NOT NULL
                  AND sub_record.trial_end_date > now();

  -- Resolve canonical status
  resolved_status := CASE
    WHEN sub_record.subscription_status = 'active' AND sub_record.is_active THEN 'active'
    WHEN trial_active THEN 'trial'
    WHEN sub_record.subscription_status IN ('past_due','canceled','expired') THEN sub_record.subscription_status
    WHEN sub_record.trial_used = true AND NOT sub_record.is_active THEN 'expired'
    ELSE 'none'
  END;

  -- Read-only ONLY when an actual paid/trial entitlement has lapsed.
  -- Free-plan users (status='none') are NOT read-only — they get free access
  -- bounded by max_animals.
  read_only := resolved_status IN ('expired','canceled','past_due');

  SELECT COUNT(*) INTO animals_count
    FROM public.animals
   WHERE "cabaña_id" = cabana_uuid
     AND LOWER(COALESCE(status, 'activo')) NOT IN ('vendido','muerto');

  RETURN QUERY SELECT
    sub_record.plan::text,
    resolved_status,
    sub_record.trial_used,
    trial_active,
    trial_days,
    sub_record.is_active,
    sub_record.max_animals,
    animals_count,
    (animals_count < sub_record.max_animals) AND NOT read_only,
    read_only,
    effective_sub_end,
    sub_record.trial_end_date;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_status(uuid)
  TO authenticated, service_role;
