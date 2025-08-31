-- Normalize animal status values to consistent lowercase format
UPDATE public.animals 
SET status = CASE 
  WHEN LOWER(status) = 'activo' OR LOWER(status) = 'active' THEN 'activo'
  WHEN LOWER(status) = 'vendido' OR LOWER(status) = 'sold' THEN 'vendido' 
  WHEN LOWER(status) = 'muerto' OR LOWER(status) = 'dead' OR LOWER(status) = 'muerte' THEN 'muerto'
  ELSE 'activo' -- Default fallback for any other values
END
WHERE status IS NOT NULL;

-- Set default status for any NULL values
UPDATE public.animals 
SET status = 'activo' 
WHERE status IS NULL;