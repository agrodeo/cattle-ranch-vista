-- Insert basic vaccines if they don't exist
INSERT INTO vaccines (code, name, description) VALUES 
  ('fmd', 'Fiebre Aftosa (FMD)', 'Vacuna contra la Fiebre Aftosa'),
  ('brucelosis', 'Brucelosis Bovina', 'Vacuna contra la Brucelosis Bovina'),
  ('rabia', 'Rabia de Origen Silvestre', 'Vacuna contra la Rabia de Origen Silvestre')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Insert additional provinces and special zones for Argentina
INSERT INTO jurisdictions (code, country, name, parent_code) VALUES
  ('AR-CT', 'AR', 'Chubut', 'AR'),
  ('AR-RN', 'AR', 'Río Negro', 'AR'),
  ('AR-NQ', 'AR', 'Neuquén', 'AR'),
  ('AR-SC', 'AR', 'Santa Cruz', 'AR'),
  ('AR-TF', 'AR', 'Tierra del Fuego', 'AR'),
  ('AR-SJ', 'AR', 'San Juan', 'AR'),
  ('AR-SF', 'AR', 'Santa Fe', 'AR'),
  ('AR-ER', 'AR', 'Entre Ríos', 'AR'),
  ('AR-CR', 'AR', 'Corrientes', 'AR'),
  ('AR-MN', 'AR', 'Misiones', 'AR'),
  ('AR-CH', 'AR', 'Chaco', 'AR'),
  ('AR-FO', 'AR', 'Formosa', 'AR'),
  ('AR-SE', 'AR', 'Santiago del Estero', 'AR'),
  ('AR-CB', 'AR', 'Córdoba', 'AR'),
  ('AR-LP', 'AR', 'La Pampa', 'AR'),
  ('AR-MZ', 'AR', 'Mendoza', 'AR'),
  ('AR-SL', 'AR', 'San Luis', 'AR'),
  ('AR-TU', 'AR', 'Tucumán', 'AR'),
  ('AR-SA', 'AR', 'Salta', 'AR'),
  ('AR-JY', 'AR', 'Jujuy', 'AR'),
  ('AR-CA', 'AR', 'Catamarca', 'AR'),
  ('AR-LR', 'AR', 'La Rioja', 'AR'),
  
  -- Special zones for Argentina
  ('AR-PATAGONIA', 'AR', 'Zona Patagonia (Libre FMD sin vacunación)', 'AR'),
  ('AR-PATAGONIA-NORTE', 'AR', 'Zona Patagonia Norte (Libre FMD sin vacunación)', 'AR'),
  ('AR-VALLES-CALINGASTA', 'AR', 'Valles de Calingasta (Libre FMD sin vacunación)', 'AR')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name;

-- Insert vaccine rules for all countries

-- ARGENTINA: FMD Rules
-- Provinces WITH mandatory FMD vaccination
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes) VALUES
  ('fmd', 'AR-BA', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA (excepto Carmen de Patagones)'),
  ('fmd', 'AR-SF', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-CB', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-ER', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-CR', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-MN', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-CH', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-FO', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-SE', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-LP', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-MZ', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-SL', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-TU', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-SA', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-JY', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-CA', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA'),
  ('fmd', 'AR-LR', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria por campaña SENASA');

-- ARGENTINA: Brucelosis Rules (mandatory for females 3-8 months, except Tierra del Fuego)
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes) VALUES
  ('brucelosis', 'AR', true, true, null, 'F', 90, 240, 'cualquiera', false, 'Obligatoria hembras 3-8 meses (excepto Tierra del Fuego)');

-- URUGUAY
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes) VALUES
  ('fmd', 'UY', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria en categorías indicadas por MGAP en cada campaña'),
  ('brucelosis', 'UY', false, true, null, 'F', 90, 240, 'cualquiera', false, 'No obligatoria a nivel país; MGAP la ordena en focos específicos');

-- PARAGUAY
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes) VALUES
  ('fmd', 'PY', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria en ciclos nacionales (2 ciclos/año) - SENACSA'),
  ('brucelosis', 'PY', true, true, null, 'F', 90, 240, 'cualquiera', false, 'Obligatoria en hembras jóvenes por ciclos SENACSA'),
  ('rabia', 'PY', true, false, 365, 'ANY', 180, null, 'cualquiera', true, 'Anual según riesgo - SENACSA');

-- COLOMBIA
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes) VALUES
  ('fmd', 'CO', true, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Obligatoria en ciclos nacionales - ICA'),
  ('brucelosis', 'CO', true, true, null, 'F', 90, 240, 'cualquiera', false, 'Obligatoria para hembras según lineamientos ICA'),
  ('rabia', 'CO', true, false, 365, 'ANY', 180, null, 'cualquiera', true, 'Obligatoria en ciclos fijados por ICA');

-- MÉXICO
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes) VALUES
  ('brucelosis', 'MX', true, true, null, 'F', 90, 180, 'cualquiera', false, 'Obligatoria becerras 3-6m con cepa 19 (NOM-041-ZOO-1995)');

-- PERÚ
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes) VALUES
  ('fmd', 'PE', false, false, 180, 'ANY', 60, null, 'cualquiera', true, 'Mayoritariamente libre sin vacunación; obligatoria solo en "zonas libres con vacunación" - SENASA'),
  ('brucelosis', 'PE', false, true, null, 'F', 90, 240, 'cualquiera', false, 'Obligatoria solo en predios/zonas de alta prevalencia (3-8m) - SENASA');

-- BRASIL
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes) VALUES
  ('brucelosis', 'BR', true, true, null, 'F', 90, 240, 'cualquiera', false, 'Obligatoria 3-8m (B19 o RB51) bajo PNCEBT');

-- Add special status for prohibited vaccines
-- FMD is PROHIBITED in Chile, Brazil, and Mexico (free countries without vaccination)
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes, active) VALUES
  ('fmd', 'CL', false, false, null, 'ANY', null, null, 'cualquiera', false, 'PROHIBIDA - Chile es libre sin vacunación', false),
  ('fmd', 'BR', false, false, null, 'ANY', null, null, 'cualquiera', false, 'NO se vacuna - Brasil libre sin vacunación', false),
  ('fmd', 'MX', false, false, null, 'ANY', null, null, 'cualquiera', false, 'NO se vacuna - México libre desde 1955', false);

-- Brucelosis in Chile is not mandatory (country in official eradication)
INSERT INTO vaccine_rules (vaccine_code, jurisdiction_code, mandatory, one_time, booster_interval_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes) VALUES
  ('brucelosis', 'CL', false, false, null, 'F', 90, 240, 'cualquiera', false, 'No obligatoria - País en erradicación oficial');

ON CONFLICT (vaccine_code, jurisdiction_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  one_time = EXCLUDED.one_time,
  booster_interval_days = EXCLUDED.booster_interval_days,
  sex = EXCLUDED.sex,
  min_age_days = EXCLUDED.min_age_days,
  max_age_days = EXCLUDED.max_age_days,
  category = EXCLUDED.category,
  pregnancy_ok = EXCLUDED.pregnancy_ok,
  notes = EXCLUDED.notes,
  active = COALESCE(EXCLUDED.active, true);