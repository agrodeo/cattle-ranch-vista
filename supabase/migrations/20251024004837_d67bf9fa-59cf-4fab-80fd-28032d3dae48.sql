-- Drop the global unique constraint on caravana_electronica
ALTER TABLE animals DROP CONSTRAINT IF EXISTS animals_caravana_electronica_unique;

-- Add a new unique constraint that combines caravana_electronica with cabaña_id
-- This allows the same caravana_electronica in different cabañas
ALTER TABLE animals ADD CONSTRAINT animals_caravana_electronica_cabana_unique 
  UNIQUE (caravana_electronica, cabaña_id);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT animals_caravana_electronica_cabana_unique ON animals IS 
  'Ensures caravana_electronica is unique within each cabaña, but can be repeated across different cabañas';