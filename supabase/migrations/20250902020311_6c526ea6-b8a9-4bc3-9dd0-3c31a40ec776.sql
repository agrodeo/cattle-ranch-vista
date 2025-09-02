-- Insert vaccine rules for all countries (with proper values for NOT NULL fields)
INSERT INTO vaccine_rules (
  vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes, 
  version, active
) VALUES
  -- Argentina FMD mandatory provinces
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
  ('fmd', 'AR-LR', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA', 1, true),
  
  -- Argentina Brucelosis (mandatory for females 3-8 months)
  ('brucelosis', 'AR', true, true, null, 30, 'F', 90, 240, 'cualquiera', false, 'Obligatoria hembras 3-8 meses (excepto Tierra del Fuego)', 1, true),
  
  -- Uruguay
  ('fmd', 'UY', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria en categorías indicadas por MGAP en cada campaña', 1, true),
  ('brucelosis', 'UY', false, true, null, 30, 'F', 90, 240, 'cualquiera', false, 'No obligatoria a nivel país; MGAP la ordena en focos específicos', 1, true),
  
  -- Paraguay  
  ('fmd', 'PY', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria en ciclos nacionales (2 ciclos/año) - SENACSA', 1, true),
  ('brucelosis', 'PY', true, true, null, 30, 'F', 90, 240, 'cualquiera', false, 'Obligatoria en hembras jóvenes por ciclos SENACSA', 1, true),
  ('rabia', 'PY', true, false, 365, 30, 'ANY', 180, null, 'cualquiera', true, 'Anual según riesgo - SENACSA', 1, true),
  
  -- Colombia
  ('fmd', 'CO', true, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria en ciclos nacionales - ICA', 1, true),
  ('brucelosis', 'CO', true, true, null, 30, 'F', 90, 240, 'cualquiera', false, 'Obligatoria para hembras según lineamientos ICA', 1, true),
  ('rabia', 'CO', true, false, 365, 30, 'ANY', 180, null, 'cualquiera', true, 'Obligatoria en ciclos fijados por ICA', 1, true),
  
  -- México
  ('brucelosis', 'MX', true, true, null, 30, 'F', 90, 180, 'cualquiera', false, 'Obligatoria becerras 3-6m con cepa 19 (NOM-041-ZOO-1995)', 1, true),
  
  -- Brasil
  ('brucelosis', 'BR', true, true, null, 30, 'F', 90, 240, 'cualquiera', false, 'Obligatoria 3-8m (B19 o RB51) bajo PNCEBT', 1, true),
  
  -- Perú (optional/conditional)
  ('fmd', 'PE', false, false, 180, 30, 'ANY', 60, null, 'cualquiera', true, 'Mayoritariamente libre sin vacunación; obligatoria solo en "zonas libres con vacunación" - SENASA', 1, true),
  ('brucelosis', 'PE', false, true, null, 30, 'F', 90, 240, 'cualquiera', false, 'Obligatoria solo en predios/zonas de alta prevalencia (3-8m) - SENASA', 1, true),
  
  -- Chile
  ('brucelosis', 'CL', false, false, null, 30, 'F', 90, 240, 'cualquiera', false, 'No obligatoria - País en erradicación oficial', 1, true),
  
  -- Prohibited vaccines (inactive rules)
  ('fmd', 'CL', false, false, null, 30, 'ANY', 0, null, 'cualquiera', false, 'PROHIBIDA - Chile es libre sin vacunación', 1, false),
  ('fmd', 'BR', false, false, null, 30, 'ANY', 0, null, 'cualquiera', false, 'NO se vacuna - Brasil libre sin vacunación', 1, false),
  ('fmd', 'MX', false, false, null, 30, 'ANY', 0, null, 'cualquiera', false, 'NO se vacuna - México libre desde 1955', 1, false);