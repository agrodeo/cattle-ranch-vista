-- Insert vaccination rules for all Latin American countries

-- Clear existing rules first
DELETE FROM public.vaccine_rules;

-- ARGENTINA RULES
-- Fiebre Aftosa - Con vacunación (Centro-Norte)
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, 
  booster_interval_days, sex, category, min_age_days, max_age_days,
  notes, source_url
) VALUES 
-- Buenos Aires - FA con vacunación + Carbunclo obligatorio
('AR-BA', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-BA', 'CARBUNCLO', true, true, null, 'ANY', 'cualquiera', 30, null, 'Carbunclo obligatorio en Buenos Aires', 'https://www.gba.gob.ar'),

-- Centro-Norte provinces - FA con vacunación
('AR-CA', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-CC', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-CB', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-CR', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-ER', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-FM', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-JY', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-LP', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-LR', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-MZ', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-MN', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-SA', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-SJ', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte (excepto Valles de Calingasta)', 'https://argentina.gob.ar'),
('AR-SL', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-SF', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-SE', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),
('AR-TM', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, null, 'Fiebre aftosa con vacunación - zona Centro-Norte', 'https://argentina.gob.ar'),

-- Patagonia provinces - FA sin vacunación
('AR-CH', 'FA', false, false, null, 'ANY', 'cualquiera', 0, null, 'Fiebre aftosa sin vacunación - Patagonia', 'https://argentina.gob.ar'),
('AR-NQ', 'FA', false, false, null, 'ANY', 'cualquiera', 0, null, 'Fiebre aftosa sin vacunación - Patagonia', 'https://argentina.gob.ar'),
('AR-RN', 'FA', false, false, null, 'ANY', 'cualquiera', 0, null, 'Fiebre aftosa sin vacunación - Patagonia', 'https://argentina.gob.ar'),
('AR-SC', 'FA', false, false, null, 'ANY', 'cualquiera', 0, null, 'Fiebre aftosa sin vacunación - Patagonia', 'https://argentina.gob.ar'),
('AR-TF', 'FA', false, false, null, 'ANY', 'cualquiera', 0, null, 'Fiebre aftosa sin vacunación - Patagonia', 'https://argentina.gob.ar');

-- Argentina - Brucelosis nacional (todas las provincias)
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, 
  sex, category, min_age_days, max_age_days,
  notes, source_url
) VALUES 
('AR', 'BRUCELOSIS', true, true, 'F', 'ternera', 90, 365, 'Programa nacional de brucelosis - terneras', 'https://argentina.gob.ar');

-- URUGUAY RULES
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, 
  booster_interval_days, sex, category, min_age_days,
  notes, source_url
) VALUES 
('UY', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, 'Fiebre aftosa obligatoria por campañas MGAP/DGSG', 'https://gub.uy');

-- PARAGUAY RULES
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, 
  booster_interval_days, sex, category, min_age_days,
  notes, source_url
) VALUES 
('PY', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, 'Fiebre aftosa campañas nacionales SENACSA', 'https://senacsa.gov.py');

-- COLOMBIA RULES
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, 
  booster_interval_days, sex, category, min_age_days,
  notes, source_url
) VALUES 
('CO', 'FA', true, false, 180, 'ANY', 'cualquiera', 30, 'Fiebre aftosa - dos ciclos nacionales por año (mayo-junio y nov-dic)', 'https://ica.gov.co');

-- MEXICO RULES
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, 
  booster_interval_days, sex, category, min_age_days,
  notes, source_url
) VALUES 
('MX', 'FA', false, false, null, 'ANY', 'cualquiera', 0, 'México libre sin vacunación desde 1955', 'https://gob.mx');

-- CHILE RULES
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, 
  booster_interval_days, sex, category, min_age_days,
  notes, source_url
) VALUES 
('CL', 'FA', false, false, null, 'ANY', 'cualquiera', 0, 'Chile libre sin vacunación', 'https://veterinaria.uchile.cl');

-- BRAZIL RULES
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, 
  booster_interval_days, sex, category, min_age_days,
  notes, source_url
) VALUES 
('BR', 'FA', false, false, null, 'ANY', 'cualquiera', 0, 'Brasil libre sin vacunación (proceso culminado 2025)', 'https://crmvrs.gov.br');

-- PERU RULES (simplified - by zone would be more complex)
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, 
  booster_interval_days, sex, category, min_age_days,
  notes, source_url
) VALUES 
('PE', 'FA', true, false, 365, 'ANY', 'cualquiera', 30, 'Fiebre aftosa por zonas sanitarias - consultar SENASA-Perú', 'https://senasa.gob.pe');