-- Add vaccine_code column to cabaña_vaccination_requirements table
ALTER TABLE cabaña_vaccination_requirements 
ADD COLUMN IF NOT EXISTS vaccine_code text;

-- Set default vaccine_code from vaccine_name for existing records (uppercase, no spaces)
UPDATE cabaña_vaccination_requirements 
SET vaccine_code = UPPER(REPLACE(vaccine_name, ' ', '_'))
WHERE vaccine_code IS NULL;

-- Make vaccine_code NOT NULL after setting defaults
ALTER TABLE cabaña_vaccination_requirements 
ALTER COLUMN vaccine_code SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cabana_vaccination_requirements_vaccine_code 
ON cabaña_vaccination_requirements(vaccine_code, cabaña_id);