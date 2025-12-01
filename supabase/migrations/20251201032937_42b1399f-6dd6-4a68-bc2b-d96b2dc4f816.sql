
-- Normalize vaccine codes in cabaña_vaccination_requirements to match animal_vaccines
-- This fixes the mismatch causing 0.0% vaccination compliance

-- Update AFTOSA (uppercase) to fmd
UPDATE cabaña_vaccination_requirements
SET vaccine_code = 'fmd'
WHERE vaccine_code = 'AFTOSA';

-- Update BRUCELOSIS (uppercase) to brucelosis (lowercase)
UPDATE cabaña_vaccination_requirements
SET vaccine_code = 'brucelosis'
WHERE vaccine_code = 'BRUCELOSIS';

-- Ensure all vaccine codes are lowercase for consistency
UPDATE cabaña_vaccination_requirements
SET vaccine_code = LOWER(vaccine_code)
WHERE vaccine_code != LOWER(vaccine_code);
