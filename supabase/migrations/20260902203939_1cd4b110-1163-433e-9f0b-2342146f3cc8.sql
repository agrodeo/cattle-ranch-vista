ALTER TABLE public."cabañas"
  ADD COLUMN IF NOT EXISTS feature_tour_completed_at timestamptz;

UPDATE public."cabañas" SET feature_tour_completed_at = now() WHERE feature_tour_completed_at IS NULL;