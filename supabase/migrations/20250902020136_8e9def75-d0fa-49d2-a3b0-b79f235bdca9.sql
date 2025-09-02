-- Insert vaccine rules for Argentina FMD (provinces WITH mandatory vaccination)
INSERT INTO vaccine_rules (
  vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes, 
  version, active
) VALUES
  ('fmd', 'AR-BA', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA (excepto Carmen de Patagones)', 1, true),
  ('fmd', 'AR-SF', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-CB', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-ER', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-CR', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-MN', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-CH', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-FO', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-SE', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-LP', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-MZ', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-SL', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-TU', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-SA', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-JY', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-CA', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  ('fmd', 'AR-LR', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true)
ON CONFLICT (vaccine_code, jurisdiction_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  one_time = EXCLUDED.one_time,
  booster_interval_days = EXCLUDED.booster_interval_days,
  coverage_window_days = EXCLUDED.coverage_window_days,
  sex = EXCLUDED.sex,
  min_age_days = EXCLUDED.min_age_days,
  max_age_days = EXCLUDED.max_age_days,
  category = EXCLUDED.category,
  pregnancy_ok = EXCLUDED.pregnancy_ok,
  notes = EXCLUDED.notes,
  active = EXCLUDED.active;