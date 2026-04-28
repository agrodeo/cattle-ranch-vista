ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_kind_check'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_kind_check CHECK (kind IN ('legacy', 'task'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activities_task_kind_status
  ON public.activities("cabaña_id", kind, status)
  WHERE kind = 'task';