-- Clean all mock/sample data from database tables

-- Clean vaccines table (remove pre-populated vaccines)
DELETE FROM vaccines WHERE id IS NOT NULL;

-- Clean vaccination_schemes table (remove sample schemes)
DELETE FROM vaccination_schemes WHERE id IS NOT NULL;

-- Clean vaccine_aliases table (remove sample aliases)
DELETE FROM vaccine_aliases WHERE id IS NOT NULL;

-- Note: Keep herd_vaccine_overrides as they may contain user-specific data
-- Note: Keep animal_vaccines and vacunas_historial as they contain actual user vaccination records