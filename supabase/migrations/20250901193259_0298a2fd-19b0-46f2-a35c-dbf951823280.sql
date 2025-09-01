-- Clean all mock/sample data from database tables (complete cleanup in correct order)

-- First, clean tables that reference vaccines
DELETE FROM vaccine_campaigns WHERE id IS NOT NULL;
DELETE FROM vaccine_aliases WHERE id IS NOT NULL;
DELETE FROM vaccination_schemes WHERE id IS NOT NULL;

-- Then clean vaccines table
DELETE FROM vaccines WHERE id IS NOT NULL;

-- Clean vaccine_rules if needed (may contain sample rules)
-- DELETE FROM vaccine_rules WHERE id IS NOT NULL;

-- Note: Keep herd_vaccine_overrides as they may contain user-specific data
-- Note: Keep animal_vaccines and vacunas_historial as they contain actual user vaccination records