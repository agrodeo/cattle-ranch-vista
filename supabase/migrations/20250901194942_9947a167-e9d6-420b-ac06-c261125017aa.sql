-- Update vaccination schemes to have proper sex restrictions
UPDATE vaccination_schemes 
SET sex_restriction = 'Hembra' 
WHERE name = 'Brucelosis Hembras';

-- Set null sex restriction for vaccines that apply to both sexes
UPDATE vaccination_schemes 
SET sex_restriction = null 
WHERE name NOT LIKE '%Hembras%';