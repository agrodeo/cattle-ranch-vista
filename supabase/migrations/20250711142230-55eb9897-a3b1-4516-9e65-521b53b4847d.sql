
-- Add new genetic metrics fields to animals table
ALTER TABLE public.animals 
ADD COLUMN IF NOT EXISTS peso_nacer numeric,
ADD COLUMN IF NOT EXISTS peso_final_mejorado numeric,
ADD COLUMN IF NOT EXISTS peso_destete_mejorado numeric;

-- Add comments to clarify the new fields
COMMENT ON COLUMN public.animals.peso_nacer IS 'PN - Peso al Nacer (kg)';
COMMENT ON COLUMN public.animals.peso_final_mejorado IS 'PF - Peso Final (kg) - Enhanced field';
COMMENT ON COLUMN public.animals.peso_destete_mejorado IS 'PD - Peso al Destete (kg) - Enhanced field';
