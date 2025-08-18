-- Crear las reglas de vacunación específicas sin usar ON CONFLICT
-- Primero eliminar reglas existentes que van a ser reemplazadas
DELETE FROM public.vaccine_rules WHERE jurisdiction_code IN ('AR-PATAGONIA', 'BR-UF-NO-VAC', 'BR-UF-VACCINATES', 'CO-RABIA-ENDEMIC', 'PE-ZONA-VAC', 'PE-ZONA-NO-VAC');

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
('AR-TF', 'AFTOSA', false, false, NULL, NULL, 'ANY', 0, NULL, 'cualquiera', true, 'Zona libre sin vacunación FA - Patagonia');

-- Ahora eliminar las jurisdicciones obsoletas que ya no tienen referencias
DELETE FROM public.jurisdictions WHERE code IN ('AR-PATAGONIA', 'BR-UF-NO-VAC', 'BR-UF-VACCINATES', 'CO-RABIA-ENDEMIC', 'PE-ZONA-VAC', 'PE-ZONA-NO-VAC');