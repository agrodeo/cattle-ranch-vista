-- Paso 1: Eliminar todas las referencias en vaccine_campaigns
DELETE FROM public.vaccine_campaigns WHERE jurisdiction_code IN ('AR-PATAGONIA', 'BR-UF-NO-VAC', 'BR-UF-VACCINATES', 'CO-RABIA-ENDEMIC', 'PE-ZONA-VAC', 'PE-ZONA-NO-VAC');

-- Paso 2: Eliminar todas las referencias en vaccine_rules
DELETE FROM public.vaccine_rules WHERE jurisdiction_code IN ('AR-PATAGONIA', 'BR-UF-NO-VAC', 'BR-UF-VACCINATES', 'CO-RABIA-ENDEMIC', 'PE-ZONA-VAC', 'PE-ZONA-NO-VAC');

-- Paso 3: Eliminar las jurisdicciones obsoletas
DELETE FROM public.jurisdictions WHERE code IN ('AR-PATAGONIA', 'BR-UF-NO-VAC', 'BR-UF-VACCINATES', 'CO-RABIA-ENDEMIC', 'PE-ZONA-VAC', 'PE-ZONA-NO-VAC');