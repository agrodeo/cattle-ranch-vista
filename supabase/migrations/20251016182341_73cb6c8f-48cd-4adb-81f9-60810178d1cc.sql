-- Add electronic tag (caravana electrónica) to animals table
-- This allows optional electronic identification for each animal

-- Add the column (nullable, unique)
ALTER TABLE public.animals 
ADD COLUMN IF NOT EXISTS caravana_electronica TEXT;

-- Create unique constraint to prevent duplicate electronic tags
ALTER TABLE public.animals 
ADD CONSTRAINT animals_caravana_electronica_unique 
UNIQUE (caravana_electronica);

-- Create index for fast lookups by electronic tag
CREATE INDEX IF NOT EXISTS idx_animals_caravana_electronica 
ON public.animals(caravana_electronica) 
WHERE caravana_electronica IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.animals.caravana_electronica IS 'Electronic tag number (optional, unique identifier for RFID/electronic identification systems)';
