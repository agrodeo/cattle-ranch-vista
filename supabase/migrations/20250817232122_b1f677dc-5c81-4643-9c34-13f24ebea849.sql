-- Step 3: Seed Catalog Data

-- Insert Vaccines
INSERT INTO public.vaccines (code, name, description) VALUES
('AFTOSA', 'Fiebre Aftosa', 'Vacuna contra la fiebre aftosa (FMD)'),
('BRUCELOSIS', 'Brucelosis RB51', 'Vacuna contra brucelosis para hembras jóvenes'),
('CARBUNCLO', 'Carbunclo/Ántrax', 'Vacuna contra carbunclo bacteridiano'),
('CLOSTRIDIALES', 'Clostridiales', 'Vacuna polivalente contra enfermedades clostridiales'),
('IBR', 'IBR (Rinotraqueítis)', 'Vacuna contra rinotraqueítis infecciosa bovina'),
('BVD', 'BVD (Diarrea Viral)', 'Vacuna contra diarrea viral bovina'),
('LEPTO', 'Leptospirosis', 'Vacuna contra leptospirosis'),
('RABIA', 'Rabia', 'Vacuna antirrábica'),
('CAMPYLO', 'Campilobacteriosis', 'Vacuna contra campilobacteriosis genital bovina'),
('TRICH', 'Tricomoniasis', 'Vacuna contra tricomoniasis genital bovina')
ON CONFLICT (code) DO NOTHING;

-- Insert Vaccine Aliases
INSERT INTO public.vaccine_aliases (vaccine_code, alias) VALUES
('CARBUNCLO', 'ántrax'),
('CARBUNCLO', 'anthrax'),
('CLOSTRIDIALES', 'clostridial'),
('CLOSTRIDIALES', 'clostridiales 7 vías'),
('CLOSTRIDIALES', 'clostridiosis'),
('IBR', 'rinotraqueítis'),
('IBR', 'rinotraqueitis'),
('BVD', 'diarrea viral'),
('BVD', 'diarrea viral bovina'),
('LEPTO', 'leptospira'),
('LEPTO', 'leptospirosis'),
('BRUCELOSIS', 'brucelosis rb51'),
('BRUCELOSIS', 'brucella'),
('AFTOSA', 'fmd'),
('AFTOSA', 'foot and mouth'),
('RABIA', 'antirrábica'),
('CAMPYLO', 'vibrio'),
('CAMPYLO', 'campilobacter')
ON CONFLICT (vaccine_code, alias) DO NOTHING;

-- Insert Jurisdictions
INSERT INTO public.jurisdictions (code, country, name, parent_code) VALUES
-- Countries
('AR', 'AR', 'Argentina', NULL),
('UY', 'UY', 'Uruguay', NULL),
('PY', 'PY', 'Paraguay', NULL),
('CO', 'CO', 'Colombia', NULL),
('MX', 'MX', 'México', NULL),
('PE', 'PE', 'Perú', NULL),
('CL', 'CL', 'Chile', NULL),
('BR', 'BR', 'Brasil', NULL),
('GLOBAL', 'GLOBAL', 'Global (Cualquier País)', NULL),

-- Argentina regions
('AR-PATAGONIA', 'AR', 'Patagonia Argentina', 'AR'),
('AR-BA', 'AR', 'Provincia de Buenos Aires', 'AR'),

-- Brazil regions
('BR-UF-VACCINATES', 'BR', 'Estados que Vacunan Aftosa', 'BR'),
('BR-UF-NO-VAC', 'BR', 'Estados Libres sin Vacunación', 'BR'),

-- Colombia regions
('CO-RABIA-ENDEMIC', 'CO', 'Zona Endémica de Rabia', 'CO'),

-- Peru regions
('PE-ZONA-VAC', 'PE', 'Zona de Vacunación Aftosa', 'PE'),
('PE-ZONA-NO-VAC', 'PE', 'Zona Libre sin Vacunación', 'PE')
ON CONFLICT (code) DO NOTHING;

-- Insert Vaccine Rules (comprehensive set)
INSERT INTO public.vaccine_rules (
  jurisdiction_code, vaccine_code, mandatory, one_time, booster_interval_days, 
  coverage_window_days, sex, min_age_days, max_age_days, category, pregnancy_ok, notes, version
) VALUES

-- GLOBAL ADVISORY RULES
('GLOBAL', 'CLOSTRIDIALES', false, false, 365, 365, 'ANY', 60, NULL, 'cualquiera', true, 'Recomendada anual para prevención', 1),
('GLOBAL', 'IBR', false, false, 365, 365, 'ANY', 90, NULL, 'cualquiera', true, 'Recomendada anual para salud respiratoria', 1),
('GLOBAL', 'BVD', false, false, 365, 365, 'ANY', 90, NULL, 'cualquiera', true, 'Recomendada anual para prevención reproductiva', 1),
('GLOBAL', 'LEPTO', false, false, 365, 365, 'ANY', 90, NULL, 'cualquiera', true, 'Recomendada anual para prevención', 1),

-- ARGENTINA
('AR', 'AFTOSA', true, false, 180, 180, 'ANY', 60, NULL, 'cualquiera', true, 'Obligatoria SENASA - Campaña semestral', 1),
('AR-PATAGONIA', 'AFTOSA', false, false, NULL, 0, 'ANY', 0, NULL, 'cualquiera', true, 'Patagonia libre de aftosa sin vacunación', 1),
('AR', 'BRUCELOSIS', true, true, NULL, NULL, 'F', 90, 240, 'vaquillona', false, 'Obligatoria SENASA hembras 3-8 meses', 1),
('AR-BA', 'CARBUNCLO', true, false, 365, 365, 'ANY', 90, NULL, 'cualquiera', true, 'Obligatorio en Provincia de Buenos Aires', 1),

-- URUGUAY
('UY', 'AFTOSA', true, false, 180, 180, 'ANY', 60, NULL, 'cualquiera', true, 'Obligatoria MGAP - Campaña anual', 1),
('UY', 'BRUCELOSIS', true, true, NULL, NULL, 'F', 90, 240, 'vaquillona', false, 'Obligatoria MGAP hembras 3-8 meses', 1),

-- PARAGUAY
('PY', 'AFTOSA', true, false, 180, 180, 'ANY', 60, NULL, 'cualquiera', true, 'Obligatoria SENACSA - Campaña semestral', 1),
('PY', 'BRUCELOSIS', true, true, NULL, NULL, 'F', 90, 240, 'vaquillona', false, 'Obligatoria SENACSA hembras 3-8 meses', 1),

-- COLOMBIA
('CO', 'AFTOSA', true, false, 180, 180, 'ANY', 60, NULL, 'cualquiera', true, 'Obligatoria ICA - Campaña nacional', 1),
('CO', 'BRUCELOSIS', true, true, NULL, NULL, 'F', 90, 240, 'vaquillona', false, 'Obligatoria ICA hembras 3-8 meses', 1),
('CO-RABIA-ENDEMIC', 'RABIA', true, false, 365, 365, 'ANY', 90, NULL, 'cualquiera', true, 'Obligatoria en zonas endémicas', 1),

-- MÉXICO
('MX', 'AFTOSA', false, false, NULL, 0, 'ANY', 0, NULL, 'cualquiera', true, 'México libre de aftosa sin vacunación', 1),
('MX', 'BRUCELOSIS', true, true, NULL, NULL, 'F', 90, 240, 'vaquillona', false, 'Obligatoria SENASICA programa nacional', 1),

-- PERÚ
('PE-ZONA-VAC', 'AFTOSA', true, false, 180, 180, 'ANY', 60, NULL, 'cualquiera', true, 'Obligatoria SENASA zona de vacunación', 1),
('PE-ZONA-NO-VAC', 'AFTOSA', false, false, NULL, 0, 'ANY', 0, NULL, 'cualquiera', true, 'Zona libre sin vacunación', 1),
('PE', 'BRUCELOSIS', true, true, NULL, NULL, 'F', 90, 240, 'vaquillona', false, 'Obligatoria SENASA hembras 3-8 meses', 1),

-- CHILE
('CL', 'AFTOSA', false, false, NULL, 0, 'ANY', 0, NULL, 'cualquiera', true, 'Chile libre de aftosa sin vacunación', 1),

-- BRASIL
('BR-UF-VACCINATES', 'AFTOSA', true, false, 180, 180, 'ANY', 60, NULL, 'cualquiera', true, 'Obligatoria MAPA estados que vacunan', 1),
('BR-UF-NO-VAC', 'AFTOSA', false, false, NULL, 0, 'ANY', 0, NULL, 'cualquiera', true, 'Estados libres sin vacunación', 1),
('BR', 'BRUCELOSIS', true, true, NULL, NULL, 'F', 90, 240, 'vaquillona', false, 'Obligatoria MAPA hembras 3-8 meses', 1)

ON CONFLICT DO NOTHING;

-- Insert Sample Campaign Windows for 2025
INSERT INTO public.vaccine_campaigns (jurisdiction_code, vaccine_code, window_start, window_end, label) VALUES
-- Argentina Aftosa Campaigns
('AR', 'AFTOSA', '2025-03-01', '2025-04-30', '1ra Campaña 2025'),
('AR', 'AFTOSA', '2025-09-01', '2025-10-31', '2da Campaña 2025'),

-- Uruguay Aftosa Campaigns
('UY', 'AFTOSA', '2025-04-01', '2025-06-30', 'Campaña Anual 2025'),

-- Paraguay Aftosa Campaigns
('PY', 'AFTOSA', '2025-03-15', '2025-05-15', '1ra Campaña 2025'),
('PY', 'AFTOSA', '2025-09-15', '2025-11-15', '2da Campaña 2025'),

-- Colombia Aftosa Campaigns
('CO', 'AFTOSA', '2025-02-01', '2025-03-31', '1ra Campaña 2025'),
('CO', 'AFTOSA', '2025-08-01', '2025-09-30', '2da Campaña 2025'),

-- Brazil Aftosa Campaigns (for vaccinating states)
('BR-UF-VACCINATES', 'AFTOSA', '2025-05-01', '2025-07-31', 'Campanha Nacional 2025'),
('BR-UF-VACCINATES', 'AFTOSA', '2025-11-01', '2025-12-31', '2da Campanha 2025'),

-- Peru Aftosa Campaigns (vaccination zones)
('PE-ZONA-VAC', 'AFTOSA', '2025-04-01', '2025-06-30', 'Campaña Nacional 2025')

ON CONFLICT DO NOTHING;