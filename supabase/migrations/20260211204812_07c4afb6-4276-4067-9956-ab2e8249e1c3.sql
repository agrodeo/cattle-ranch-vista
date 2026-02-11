-- Add updated_at column to animals table for incremental sync
ALTER TABLE animals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill existing rows
UPDATE animals SET updated_at = now() WHERE updated_at IS NULL;

-- Trigger to auto-update updated_at on animals
CREATE OR REPLACE FUNCTION update_animals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_animals_updated_at ON animals;
CREATE TRIGGER set_animals_updated_at
  BEFORE UPDATE ON animals
  FOR EACH ROW
  EXECUTE FUNCTION update_animals_updated_at();

-- Add updated_at column to finances table for incremental sync
ALTER TABLE finances ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill existing rows
UPDATE finances SET updated_at = now() WHERE updated_at IS NULL;

-- Trigger to auto-update updated_at on finances
CREATE OR REPLACE FUNCTION update_finances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_finances_updated_at ON finances;
CREATE TRIGGER set_finances_updated_at
  BEFORE UPDATE ON finances
  FOR EACH ROW
  EXECUTE FUNCTION update_finances_updated_at();