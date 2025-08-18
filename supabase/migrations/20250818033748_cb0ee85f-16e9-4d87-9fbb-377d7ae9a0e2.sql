-- Actualizar las reglas de vacunación para reflejar las jurisdicciones específicas
-- Primero, actualizar las reglas existentes para usar las nuevas jurisdicciones

-- Reglas para Fiebre Aftosa - Provincias Argentinas CON vacunación (Centro-Norte)
UPDATE public.vaccine_rules 
SET jurisdiction_code = 'AR-BA' 
WHERE jurisdiction_code = 'AR-PATAGONIA' AND vaccine_code = 'AFTOSA';

-- Crear reglas específicas para cada provincia argentina CON vacunación FA
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes
) VALUES
-- Buenos Aires - Fiebre Aftosa + Carbunclo obligatorio
('AR-BA', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-BA', 'CARBUNCLO', true, true, NULL, NULL, 'ANY', 90, NULL, 'cualquiera', false, 'Obligatorio por Res. 115/14 Provincia de Buenos Aires'),
-- Resto de provincias Centro-Norte - Solo Fiebre Aftosa
('AR-CA', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-CC', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-CB', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-CR', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-ER', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-FM', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-JY', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-LR', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-MZ', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-MN', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-SA', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-SJ', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-SL', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-SF', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-SE', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-TM', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
('AR-LP', 'AFTOSA', true, false, 180, 45, 'ANY', 60, NULL, 'cualquiera', false, 'Vacunación cada 6 meses según calendario SENASA'),
-- Provincias Patagónicas - SIN vacunación FA
('AR-CH', 'AFTOSA', false, false, NULL, NULL, 'ANY', 0, NULL, 'cualquiera', true, 'Zona libre sin vacunación FA - Patagonia'),
('AR-NQ', 'AFTOSA', false, false, NULL, NULL, 'ANY', 0, NULL, 'cualquiera', true, 'Zona libre sin vacunación FA - Patagonia'),
('AR-RN', 'AFTOSA', false, false, NULL, NULL, 'ANY', 0, NULL, 'cualquiera', true, 'Zona libre sin vacunación FA - Patagonia'),
('AR-SC', 'AFTOSA', false, false, NULL, NULL, 'ANY', 0, NULL, 'cualquiera', true, 'Zona libre sin vacunación FA - Patagonia'),
('AR-TF', 'AFTOSA', false, false, NULL, NULL, 'ANY', 0, NULL, 'cualquiera', true, 'Zona libre sin vacunación FA - Patagonia')
ON CONFLICT (jurisdiction_code, vaccine_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  one_time = EXCLUDED.one_time,
  booster_interval_days = EXCLUDED.booster_interval_days,
  coverage_window_days = EXCLUDED.coverage_window_days,
  notes = EXCLUDED.notes;

-- Reglas para todos los departamentos de Uruguay - FA obligatoria
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes
)
SELECT 
  j.code,
  'AFTOSA',
  true,
  false,
  180,
  45,
  'ANY',
  60,
  NULL,
  'cualquiera',
  false,
  'Campañas obligatorias MGAP-DGSG Uruguay'
FROM public.jurisdictions j 
WHERE j.country = 'UY' AND j.parent_code = 'UY'
ON CONFLICT (jurisdiction_code, vaccine_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  notes = EXCLUDED.notes;

-- Reglas para todos los departamentos de Paraguay - FA obligatoria
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes
)
SELECT 
  j.code,
  'AFTOSA',
  true,
  false,
  180,
  45,
  'ANY',
  60,
  NULL,
  'cualquiera',
  false,
  'Campañas nacionales SENACSA - Evaluando transición a sin vacunación 2027'
FROM public.jurisdictions j 
WHERE j.country = 'PY' AND j.parent_code = 'PY'
ON CONFLICT (jurisdiction_code, vaccine_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  notes = EXCLUDED.notes;

-- Reglas para todos los departamentos de Colombia - FA obligatoria (2 ciclos/año)
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes
)
SELECT 
  j.code,
  'AFTOSA',
  true,
  false,
  180,
  45,
  'ANY',
  60,
  NULL,
  'cualquiera',
  false,
  'Dos ciclos anuales (mayo-junio y nov-dic) - ICA Colombia'
FROM public.jurisdictions j 
WHERE j.country = 'CO' AND j.parent_code = 'CO'
ON CONFLICT (jurisdiction_code, vaccine_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  notes = EXCLUDED.notes;

-- Reglas para todos los estados de México - FA NO obligatoria (país libre)
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes
)
SELECT 
  j.code,
  'AFTOSA',
  false,
  false,
  NULL,
  NULL,
  'ANY',
  0,
  NULL,
  'cualquiera',
  true,
  'México libre de FA sin vacunación desde 1955'
FROM public.jurisdictions j 
WHERE j.country = 'MX' AND j.parent_code = 'MX'
ON CONFLICT (jurisdiction_code, vaccine_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  notes = EXCLUDED.notes;

-- Reglas para todas las regiones de Chile - FA NO obligatoria (país libre)
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes
)
SELECT 
  j.code,
  'AFTOSA',
  false,
  false,
  NULL,
  NULL,
  'ANY',
  0,
  NULL,
  'cualquiera',
  true,
  'Chile libre de FA sin vacunación'
FROM public.jurisdictions j 
WHERE j.country = 'CL' AND j.parent_code = 'CL'
ON CONFLICT (jurisdiction_code, vaccine_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  notes = EXCLUDED.notes;

-- Reglas para todos los estados de Brasil - FA NO obligatoria (país libre desde 2025)
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes
)
SELECT 
  j.code,
  'AFTOSA',
  false,
  false,
  NULL,
  NULL,
  'ANY',
  0,
  NULL,
  'cualquiera',
  true,
  'Brasil libre de FA sin vacunación (OMSA 2025) - MAPA'
FROM public.jurisdictions j 
WHERE j.country = 'BR' AND j.parent_code = 'BR'
ON CONFLICT (jurisdiction_code, vaccine_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  notes = EXCLUDED.notes;

-- Reglas para todos los departamentos de Perú - FA variable por zona sanitaria
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes
)
SELECT 
  j.code,
  'AFTOSA',
  true,
  false,
  180,
  45,
  'ANY',
  60,
  NULL,
  'cualquiera',
  false,
  'Consultar campañas vigentes SENASA-Perú por zona sanitaria'
FROM public.jurisdictions j 
WHERE j.country = 'PE' AND j.parent_code = 'PE'
ON CONFLICT (jurisdiction_code, vaccine_code) DO UPDATE SET
  mandatory = EXCLUDED.mandatory,
  notes = EXCLUDED.notes;