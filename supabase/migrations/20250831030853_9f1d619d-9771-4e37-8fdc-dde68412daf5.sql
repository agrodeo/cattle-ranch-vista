-- Populate initial corral movements for existing animals
INSERT INTO public.corral_movements (
  animal_id,
  cabaña_id,
  corral_anterior_id,
  corral_nuevo_id,
  fecha_movimiento,
  registrado_por,
  motivo
)
SELECT 
  a.id,
  a.cabaña_id,
  NULL, -- no previous corral for initial assignment
  a.corral_id,
  COALESCE(a.birth_date, CURRENT_DATE - INTERVAL '1 year'), -- use birth date or default
  (
    SELECT u.id 
    FROM public.users u 
    WHERE u.cabaña_id = a.cabaña_id 
    LIMIT 1
  ), -- first user of the cabaña
  'Asignación inicial'
FROM public.animals a
WHERE a.corral_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.corral_movements cm 
    WHERE cm.animal_id = a.id
  );