-- First, add common vaccines that are missing
INSERT INTO public.vaccines (code, name, active) VALUES
  ('anthrax', 'Carbunco (Antrax)', true),
  ('clostridiosis', 'Clostridiosis (múltiples cepas)', true),
  ('triple_viral', 'Triple Viral Bovina', true),
  ('other', 'Otra vacuna', true)
ON CONFLICT (code) DO NOTHING;

-- Now migrate existing vaccination records from vacunas_historial to animal_vaccines
INSERT INTO public.animal_vaccines (
  animal_id,
  cabaña_id,
  vaccine_code,
  date,
  lot,
  dose,
  route,
  next_due,
  dose_number,
  requirement_id,
  is_complete,
  created_by,
  created_at
)
SELECT 
  vh.animal_id,
  vh.cabaña_id,
  COALESCE(
    -- Try to match vaccine by name (remove text in parentheses first)
    (SELECT v.code FROM public.vaccines v 
     WHERE v.name ILIKE '%' || TRIM(REGEXP_REPLACE(vh.vacuna, '\s*\(.*\)', '')) || '%' 
     LIMIT 1),
    -- Fallback mappings for common vaccines
    CASE 
      WHEN vh.vacuna ILIKE '%aftosa%' OR vh.vacuna ILIKE '%fmd%' THEN 'fmd'
      WHEN vh.vacuna ILIKE '%brucelosis%' THEN 'brucelosis'
      WHEN vh.vacuna ILIKE '%carbunco%' OR vh.vacuna ILIKE '%antrax%' THEN 'anthrax'
      WHEN vh.vacuna ILIKE '%rabia%' THEN 'rabia'
      WHEN vh.vacuna ILIKE '%clostr%' THEN 'clostridiosis'
      WHEN vh.vacuna ILIKE '%triple%' THEN 'triple_viral'
      ELSE 'other'
    END
  ) as vaccine_code,
  vh.fecha,
  vh.lote,
  vh.dosis,
  vh.via,
  vh.proxima_dosis,
  COALESCE(vh.dose_number, 1),
  -- Try to match requirement_id
  (SELECT vr.id 
   FROM public.cabaña_vaccination_requirements vr
   INNER JOIN public.vaccines v ON v.name ILIKE vr.vaccine_name
   WHERE vr.cabaña_id = vh.cabaña_id
     AND vr.is_active = true
     AND (
       v.name ILIKE '%' || TRIM(REGEXP_REPLACE(vh.vacuna, '\s*\(.*\)', '')) || '%'
       OR vr.vaccine_name ILIKE '%' || TRIM(REGEXP_REPLACE(vh.vacuna, '\s*\(.*\)', '')) || '%'
     )
   LIMIT 1
  ),
  false as is_complete,
  -- Use cabaña owner as created_by for historical records
  COALESCE(
    (SELECT owner_id FROM public.cabañas WHERE id = vh.cabaña_id),
    (SELECT user_id FROM public.profiles WHERE cabaña_id = vh.cabaña_id LIMIT 1)
  ),
  vh.created_at
FROM public.vacunas_historial vh
WHERE NOT EXISTS (
  -- Only insert if not already in animal_vaccines
  SELECT 1 FROM public.animal_vaccines av
  WHERE av.animal_id = vh.animal_id
    AND av.date = vh.fecha
    AND av.cabaña_id = vh.cabaña_id
)
AND (
  -- Make sure we have a valid created_by
  (SELECT owner_id FROM public.cabañas WHERE id = vh.cabaña_id) IS NOT NULL
  OR (SELECT user_id FROM public.profiles WHERE cabaña_id = vh.cabaña_id LIMIT 1) IS NOT NULL
)
ON CONFLICT DO NOTHING;