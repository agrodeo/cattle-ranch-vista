-- Normalize vaccine codes in animal_vaccines to match cabaña_vaccination_requirements
-- This fixes the 0.0% vaccination compliance issue caused by code mismatches

-- Update old Aftosa codes to standardized 'fmd' code
UPDATE animal_vaccines
SET vaccine_code = 'fmd'
WHERE vaccine_code IN ('Aftosa', 'Aftosa (Fiebre Aftosa)', 'aftosa');

-- Update other common mismatches if they exist
UPDATE animal_vaccines
SET vaccine_code = 'anthrax'
WHERE vaccine_code IN ('Carbunco', 'carbunco');

-- Update any remaining codes that might have case inconsistencies
UPDATE animal_vaccines
SET vaccine_code = LOWER(vaccine_code)
WHERE vaccine_code != LOWER(vaccine_code);