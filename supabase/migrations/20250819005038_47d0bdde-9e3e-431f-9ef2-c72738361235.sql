-- Agregar función para actualizar estado de preñeces
CREATE OR REPLACE FUNCTION public.update_pregnancy_status(
  _user_id UUID,
  _service_animal_ids UUID[],
  _estado TEXT,
  _result_source TEXT DEFAULT 'manual'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_cabana_id UUID;
  service_animal_id UUID;
  animal_id UUID;
  updated_count INTEGER := 0;
BEGIN
  -- Validar estado
  IF _estado NOT IN ('preñada', 'vacía', 'pendiente') THEN
    RAISE EXCEPTION 'Estado inválido: %', _estado;
  END IF;

  -- Obtener cabaña del usuario
  SELECT cabaña_id INTO user_cabana_id FROM public.users WHERE id = _user_id;
  IF user_cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;

  -- Actualizar cada registro
  FOREACH service_animal_id IN ARRAY _service_animal_ids
  LOOP
    -- Obtener el animal_id y verificar permisos
    SELECT isa.animal_id INTO animal_id
    FROM public.ia_service_animals isa
    WHERE isa.id = service_animal_id
      AND isa.cabaña_id = user_cabana_id;
    
    IF animal_id IS NULL THEN
      RAISE EXCEPTION 'Registro de servicio % no encontrado o sin permisos', service_animal_id;
    END IF;

    -- Actualizar estado en ia_service_animals
    UPDATE public.ia_service_animals
    SET estado = _estado,
        result_source = _result_source,
        updated_by = _user_id,
        updated_at = now()
    WHERE id = service_animal_id;

    -- Actualizar estado de preñez en animals
    IF _estado = 'preñada' THEN
      UPDATE public.animals
      SET esta_preñada = TRUE,
          fecha_ultima_preñez = CURRENT_DATE
      WHERE id = animal_id;
    ELSIF _estado = 'vacía' THEN
      UPDATE public.animals
      SET esta_preñada = FALSE
      WHERE id = animal_id;
    END IF;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'updated_count', updated_count,
    'success', true
  );
END;
$function$;

-- Función para obtener estadísticas de un servicio
CREATE OR REPLACE FUNCTION public.get_service_pregnancy_stats(_service_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  stats JSONB;
  total_count INTEGER;
  pendientes_count INTEGER;
  preñadas_count INTEGER;
  vacias_count INTEGER;
  porcentaje_preñez NUMERIC;
BEGIN
  -- Contar estados
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE estado = 'pendiente'),
    COUNT(*) FILTER (WHERE estado = 'preñada'),
    COUNT(*) FILTER (WHERE estado = 'vacía')
  INTO total_count, pendientes_count, preñadas_count, vacias_count
  FROM public.ia_service_animals
  WHERE service_id = _service_id;

  -- Calcular porcentaje (excluir pendientes del denominador)
  IF (preñadas_count + vacias_count) > 0 THEN
    porcentaje_preñez := ROUND((preñadas_count::NUMERIC / (preñadas_count + vacias_count)::NUMERIC) * 100, 1);
  ELSE
    porcentaje_preñez := NULL;
  END IF;

  stats := jsonb_build_object(
    'total', total_count,
    'pendientes', pendientes_count,
    'preñadas', preñadas_count,
    'vacias', vacias_count,
    'porcentaje_preñez', porcentaje_preñez
  );

  RETURN stats;
END;
$function$;