-- Insert basic vaccination schemes for Argentina
INSERT INTO vaccination_schemes (
  name, vaccine_type, country, is_mandatory, frequency_days, 
  min_age_months, description, is_active
) VALUES 
-- Mandatory vaccines
('Aftosa - Primera Dosis', 'aftosa', 'Argentina', true, 365, 3, 'Vacuna obligatoria contra fiebre aftosa - Primera dosis a los 3 meses', true),
('Aftosa - Refuerzo Anual', 'aftosa', 'Argentina', true, 365, 15, 'Vacuna obligatoria contra fiebre aftosa - Refuerzo anual', true),
('Brucelosis Hembras', 'brucelosis', 'Argentina', true, null, 3, 'Vacuna obligatoria para hembras entre 3-8 meses (una sola vez)', true),

-- Recommended vaccines
('Carbunclo', 'carbunclo', 'Argentina', false, 365, 6, 'Vacuna recomendada contra carbunclo bacteridiano', true),
('Mancha Infecciosa', 'mancha', 'Argentina', false, 365, 6, 'Vacuna recomendada contra mancha infecciosa', true),
('Gangrena Gaseosa', 'gangrena', 'Argentina', false, 365, 6, 'Vacuna recomendada contra gangrena gaseosa', true),
('IBR/DVB/PI3', 'ibr_dvb', 'Argentina', false, 365, 4, 'Vacuna recomendada contra enfermedades respiratorias', true),
('Leptospirosis', 'leptospirosis', 'Argentina', false, 365, 6, 'Vacuna recomendada contra leptospirosis', true);

-- Update the cabaña with Argentina location info
UPDATE cabañas 
SET country_code = 'AR', province_code = 'BA', location_updated_at = now()
WHERE id = '26a4288b-0ab5-4abf-b88c-25de5dca0273';