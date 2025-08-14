-- Insertar causas de muerte comunes para todas las cabañas
INSERT INTO public.catalogo_causas (id, cabaña_id, nombre, activo, orden) VALUES 
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Enfermedad respiratoria', true, 1),
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Problemas digestivos', true, 2),
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Parto distócico', true, 3),
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Neumonía', true, 4),
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Diarrea', true, 5),
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Accidente', true, 6),
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Envenenamiento', true, 7),
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Predadores', true, 8),
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Vejez', true, 9),
  (gen_random_uuid(), (SELECT id FROM cabañas LIMIT 1), 'Desconocida', true, 10)
ON CONFLICT DO NOTHING;

-- Crear función para agregar causas comunes a una nueva cabaña
CREATE OR REPLACE FUNCTION public.add_default_death_causes_to_cabana(_cabana_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Insertar causas de muerte comunes para la cabaña específica
  INSERT INTO public.catalogo_causas (cabaña_id, nombre, activo, orden) VALUES 
    (_cabana_id, 'Enfermedad respiratoria', true, 1),
    (_cabana_id, 'Problemas digestivos', true, 2),
    (_cabana_id, 'Parto distócico', true, 3),
    (_cabana_id, 'Neumonía', true, 4),
    (_cabana_id, 'Diarrea', true, 5),
    (_cabana_id, 'Accidente', true, 6),
    (_cabana_id, 'Envenenamiento', true, 7),
    (_cabana_id, 'Predadores', true, 8),
    (_cabana_id, 'Vejez', true, 9),
    (_cabana_id, 'Desconocida', true, 10)
  ON CONFLICT DO NOTHING;
END;
$function$;

-- Agregar causas comunes a todas las cabañas existentes que no las tengan
DO $$ 
DECLARE
  cabana_record RECORD;
BEGIN
  FOR cabana_record IN SELECT id FROM public.cabañas LOOP
    -- Solo agregar si la cabaña no tiene causas ya definidas
    IF NOT EXISTS (SELECT 1 FROM public.catalogo_causas WHERE cabaña_id = cabana_record.id) THEN
      PERFORM public.add_default_death_causes_to_cabana(cabana_record.id);
    END IF;
  END LOOP;
END $$;