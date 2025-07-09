-- Add new fields to animals table
ALTER TABLE public.animals 
ADD COLUMN peso_nacimiento numeric,
ADD COLUMN mocho text,
ADD COLUMN color text,
ADD COLUMN condicion_corporal text,
ADD COLUMN observaciones text;

-- Add comments for clarity
COMMENT ON COLUMN public.animals.peso_nacimiento IS 'Birth weight in kilograms';
COMMENT ON COLUMN public.animals.mocho IS 'Polled/Horned status: Mocho, Con Cuernos, Desconocido';
COMMENT ON COLUMN public.animals.color IS 'Animal color';
COMMENT ON COLUMN public.animals.condicion_corporal IS 'Body condition score';
COMMENT ON COLUMN public.animals.observaciones IS 'General notes and observations';