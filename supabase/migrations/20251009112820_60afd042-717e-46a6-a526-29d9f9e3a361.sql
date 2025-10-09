-- Backfill: Trigger sync for all existing animals with weights
-- Use a simple UPDATE to trigger the sync_weights_on_update trigger
UPDATE public.animals
SET peso_nacimiento = peso_nacimiento
WHERE birth_date IS NOT NULL
  AND (peso_nacimiento IS NOT NULL OR peso_destete IS NOT NULL OR peso_final IS NOT NULL);