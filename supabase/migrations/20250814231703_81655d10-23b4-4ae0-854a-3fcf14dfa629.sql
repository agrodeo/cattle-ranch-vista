-- Clean up duplicate entries in catalogo_causas based on name and cabaña_id
DELETE FROM public.catalogo_causas cc1 
WHERE EXISTS (
  SELECT 1 FROM public.catalogo_causas cc2 
  WHERE cc2.nombre = cc1.nombre 
  AND cc2.cabaña_id = cc1.cabaña_id
  AND cc2.id < cc1.id
);

-- Remove control options from catalogo_causas if they exist
DELETE FROM public.catalogo_causas 
WHERE LOWER(nombre) LIKE '%otra causa%' 
   OR LOWER(nombre) LIKE '%agregar%';