-- Fix requirement_id linking with improved matching logic
UPDATE public.animal_vaccines av
SET requirement_id = vr.id
FROM public.cabaña_vaccination_requirements vr, public.vaccines v
WHERE av.requirement_id IS NULL
  AND av.cabaña_id = vr.cabaña_id
  AND v.code = av.vaccine_code
  AND vr.is_active = true
  AND (
    -- Exact match
    vr.vaccine_name ILIKE v.name
    -- Requirement name is contained in vaccine name
    OR v.name ILIKE '%' || vr.vaccine_name || '%'
    -- Vaccine code matches requirement name
    OR vr.vaccine_name ILIKE '%' || v.code || '%'
  );