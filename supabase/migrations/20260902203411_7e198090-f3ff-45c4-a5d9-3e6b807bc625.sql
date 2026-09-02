ALTER TABLE public.cabañas ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;

-- Existing ranches should never see the onboarding wizard again
UPDATE public.cabañas SET onboarding_completed_at = now() WHERE onboarding_completed_at IS NULL;