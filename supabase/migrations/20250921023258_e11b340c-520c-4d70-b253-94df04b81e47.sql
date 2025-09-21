-- Add columns for dose information to cabaña_vaccination_requirements
ALTER TABLE public.cabaña_vaccination_requirements 
ADD COLUMN doses_required INTEGER DEFAULT 1,
ADD COLUMN interval_between_doses_days INTEGER;

-- Add column to vaccination history to track dose sequence
ALTER TABLE public.vacunas_historial 
ADD COLUMN dose_number INTEGER DEFAULT 1;

-- Update existing records to have default values
UPDATE public.cabaña_vaccination_requirements 
SET doses_required = 1 
WHERE doses_required IS NULL;