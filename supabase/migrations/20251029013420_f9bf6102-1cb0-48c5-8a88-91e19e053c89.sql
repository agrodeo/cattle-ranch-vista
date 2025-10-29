-- Update animal_vaccines to link with requirements using the vaccines table
UPDATE public.animal_vaccines av
SET requirement_id = vr.id
FROM public.cabaña_vaccination_requirements vr
INNER JOIN public.vaccines v ON v.name ILIKE vr.vaccine_name OR vr.vaccine_name ILIKE '%' || v.name || '%'
WHERE av.requirement_id IS NULL
  AND av.cabaña_id = vr.cabaña_id
  AND v.code = av.vaccine_code
  AND vr.is_active = true;