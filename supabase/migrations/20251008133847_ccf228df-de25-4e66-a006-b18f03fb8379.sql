-- Add castration tracking to animals table
ALTER TABLE public.animals
ADD COLUMN IF NOT EXISTS is_castrated boolean DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.animals.is_castrated IS 'Indicates if male animal has been castrated (affects category classification)';

-- Create index for performance when filtering by castration status
CREATE INDEX IF NOT EXISTS idx_animals_castrated ON public.animals(is_castrated) WHERE is_castrated = true;
