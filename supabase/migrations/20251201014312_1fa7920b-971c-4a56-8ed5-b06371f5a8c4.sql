-- Add capacity column to corrales table (nullable, no breaking changes)
ALTER TABLE corrales ADD COLUMN IF NOT EXISTS capacity INTEGER NULL;

-- Add helpful comment
COMMENT ON COLUMN corrales.capacity IS 'Maximum number of animals the corral can hold. Nullable for backward compatibility.';