-- Add columns to store parent names and basic info when they don't exist as full animals
ALTER TABLE public.animals 
ADD COLUMN father_name TEXT,
ADD COLUMN mother_name TEXT,
ADD COLUMN father_breed TEXT,
ADD COLUMN mother_breed TEXT,
ADD COLUMN father_registration TEXT,
ADD COLUMN mother_registration TEXT;

-- Add comments to clarify the new columns
COMMENT ON COLUMN public.animals.father_name IS 'Name of father when not registered as full animal';
COMMENT ON COLUMN public.animals.mother_name IS 'Name of mother when not registered as full animal';
COMMENT ON COLUMN public.animals.father_breed IS 'Breed of father when not registered as full animal';
COMMENT ON COLUMN public.animals.mother_breed IS 'Breed of mother when not registered as full animal';
COMMENT ON COLUMN public.animals.father_registration IS 'Registration level of father when not registered as full animal';
COMMENT ON COLUMN public.animals.mother_registration IS 'Registration level of mother when not registered as full animal';