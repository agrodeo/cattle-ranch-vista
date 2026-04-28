-- Extend the existing activities table for dashboard task activities without removing existing records
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS "cabaña_id" uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS corral_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill ranch id for existing animal-linked rows when possible
UPDATE public.activities act
SET "cabaña_id" = a."cabaña_id"
FROM public.animals a
WHERE act.animal_id = a.id
  AND act."cabaña_id" IS NULL;

-- Backfill title for legacy activity rows so dashboard queries remain safe
UPDATE public.activities
SET title = COALESCE(NULLIF(description, ''), NULLIF(type, ''), 'Actividad')
WHERE title IS NULL;

-- Add task validation constraints safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_status_check'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_status_check CHECK (status IN ('pending', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_priority_check'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_priority_check CHECK (priority IN ('alta', 'media', 'baja'));
  END IF;
END $$;

-- Add foreign keys only for public application tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_cabana_id_fkey'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_cabana_id_fkey
      FOREIGN KEY ("cabaña_id") REFERENCES public."cabañas"(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_animal_id_fkey'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_animal_id_fkey
      FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_corral_id_fkey'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_corral_id_fkey
      FOREIGN KEY (corral_id) REFERENCES public.corrales(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for dashboard/task queries
CREATE INDEX IF NOT EXISTS idx_activities_cabana ON public.activities("cabaña_id");
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities("cabaña_id", status);
CREATE INDEX IF NOT EXISTS idx_activities_assigned ON public.activities(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_due ON public.activities(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_activities_animal ON public.activities(animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_corral ON public.activities(corral_id) WHERE corral_id IS NOT NULL;

-- Auto-update updated_at for task records
CREATE OR REPLACE FUNCTION public.update_activities_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activities_updated_at ON public.activities;
CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_activities_updated_at();

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Task-specific RLS policies. Existing policies remain for legacy animal activity records.
CREATE POLICY "Users can view task activities in their cabana"
  ON public.activities
  FOR SELECT
  TO authenticated
  USING (
    "cabaña_id" IS NOT NULL
    AND current_user_is_active_in_cabana("cabaña_id")
  );

CREATE POLICY "Writers can create task activities"
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "cabaña_id" IS NOT NULL
    AND current_user_is_active_in_cabana("cabaña_id")
    AND can_modify_data(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Writers and assignees can update task activities"
  ON public.activities
  FOR UPDATE
  TO authenticated
  USING (
    "cabaña_id" IS NOT NULL
    AND current_user_is_active_in_cabana("cabaña_id")
    AND (
      can_modify_data(auth.uid())
      OR assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    "cabaña_id" IS NOT NULL
    AND current_user_is_active_in_cabana("cabaña_id")
    AND (
      can_modify_data(auth.uid())
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY "Writers can delete task activities"
  ON public.activities
  FOR DELETE
  TO authenticated
  USING (
    "cabaña_id" IS NOT NULL
    AND current_user_is_active_in_cabana("cabaña_id")
    AND can_modify_data(auth.uid())
  );