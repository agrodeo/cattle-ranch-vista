-- Clean all mock/sample data from database tables (correct order for foreign keys)

-- Clean vaccine_aliases first (references vaccines)
DELETE FROM vaccine_aliases WHERE id IS NOT NULL;

-- Clean vaccination_schemes table (remove sample schemes)
DELETE FROM vaccination_schemes WHERE id IS NOT NULL;

-- Clean vaccines table (remove pre-populated vaccines)
DELETE FROM vaccines WHERE id IS NOT NULL;

-- Note: Keep herd_vaccine_overrides as they may contain user-specific data
-- Note: Keep animal_vaccines and vacunas_historial as they contain actual user vaccination records