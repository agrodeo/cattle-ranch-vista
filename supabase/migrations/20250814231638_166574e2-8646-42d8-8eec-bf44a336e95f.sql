-- Clean up duplicate death causes
DELETE FROM public.causas_muerte cm1 
WHERE EXISTS (
  SELECT 1 FROM public.causas_muerte cm2 
  WHERE cm2.causa_id = cm1.causa_id 
  AND cm2.cabaña_id = cm1.cabaña_id 
  AND cm2.id < cm1.id
);

-- Clean up duplicate entries in catalogo_causas
DELETE FROM public.catalogo_causas cc1 
WHERE EXISTS (
  SELECT 1 FROM public.catalogo_causas cc2 
  WHERE cc2.nombre = cc1.nombre 
  AND cc2.id < cc1.id
);

-- Remove control options from catalogo_causas if they exist
DELETE FROM public.catalogo_causas 
WHERE LOWER(nombre) LIKE '%otra causa%' 
   OR LOWER(nombre) LIKE '%agregar%';