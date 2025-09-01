-- Clean all mock/sample data from database tables (complete cleanup with vaccine_rules)

-- Clean all dependent tables first
DELETE FROM vaccine_campaigns WHERE id IS NOT NULL;
DELETE FROM vaccine_rules WHERE id IS NOT NULL;
DELETE FROM vaccine_aliases WHERE id IS NOT NULL;
DELETE FROM vaccination_schemes WHERE id IS NOT NULL;

-- Finally clean vaccines table
DELETE FROM vaccines WHERE id IS NOT NULL;

-- Note: Keep herd_vaccine_overrides as they may contain user-specific data
-- Note: Keep animal_vaccines and vacunas_historial as they contain actual user vaccination records