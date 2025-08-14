-- Update manage_death_causes function to work with custom auth system
CREATE OR REPLACE FUNCTION public.manage_death_causes(_user_id uuid, _action text, _id uuid DEFAULT NULL::uuid, _nombre text DEFAULT NULL::text, _activo boolean DEFAULT true, _orden integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _cabana_id UUID;
  _cause_id UUID;
  result JSON;
BEGIN
  -- Get user's cabaña_id from custom users table
  SELECT cabaña_id INTO _cabana_id FROM public.users WHERE id = _user_id;
  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;
  
  CASE _action
    WHEN 'list' THEN
      SELECT json_agg(
        json_build_object(
          'id', id,
          'nombre', nombre,
          'activo', activo,
          'orden', orden
        ) ORDER BY orden, nombre
      ) INTO result
      FROM public.catalogo_causas
      WHERE cabaña_id = _cabana_id AND activo = true;
      
      RETURN COALESCE(result, '[]'::json);
      
    WHEN 'create' THEN
      IF _nombre IS NULL OR TRIM(_nombre) = '' THEN
        RAISE EXCEPTION 'El nombre de la causa es requerido';
      END IF;
      
      INSERT INTO public.catalogo_causas (cabaña_id, nombre, activo, orden)
      VALUES (_cabana_id, TRIM(_nombre), _activo, COALESCE(_orden, 0))
      RETURNING id INTO _cause_id;
      
      RETURN json_build_object(
        'id', _cause_id,
        'success', true,
        'message', 'Causa de muerte creada correctamente'
      );
      
    WHEN 'update' THEN
      IF _id IS NULL THEN
        RAISE EXCEPTION 'ID de causa requerido para actualizar';
      END IF;
      
      UPDATE public.catalogo_causas 
      SET 
        nombre = COALESCE(TRIM(_nombre), nombre),
        activo = COALESCE(_activo, activo),
        orden = COALESCE(_orden, orden),
        updated_at = now()
      WHERE id = _id AND cabaña_id = _cabana_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Causa no encontrada';
      END IF;
      
      RETURN json_build_object(
        'success', true,
        'message', 'Causa actualizada correctamente'
      );
      
    WHEN 'delete' THEN
      IF _id IS NULL THEN
        RAISE EXCEPTION 'ID de causa requerido para eliminar';
      END IF;
      
      -- Soft delete by setting activo = false
      UPDATE public.catalogo_causas 
      SET activo = false, updated_at = now()
      WHERE id = _id AND cabaña_id = _cabana_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Causa no encontrada';
      END IF;
      
      RETURN json_build_object(
        'success', true,
        'message', 'Causa desactivada correctamente'
      );
      
    ELSE
      RAISE EXCEPTION 'Acción no válida: %', _action;
  END CASE;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- Update marcar_defuncion function to work with custom auth system
CREATE OR REPLACE FUNCTION public.marcar_defuncion(_user_id uuid, _animal_id uuid, _fecha_defuncion date, _causa_id uuid DEFAULT NULL::uuid, _causa_texto text DEFAULT NULL::text, _notas text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _cabana_id UUID;
  _animal_status TEXT;
  _birth_date DATE;
  _defuncion_id UUID;
  _edad_dias INTEGER;
  _edad_meses INTEGER;
  result JSON;
BEGIN
  -- Get user's cabaña_id from custom users table
  SELECT cabaña_id INTO _cabana_id FROM public.users WHERE id = _user_id;
  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;
  
  -- Verify animal exists and belongs to user's cabaña
  SELECT status, birth_date, cabaña_id 
  INTO _animal_status, _birth_date, _cabana_id
  FROM public.animals 
  WHERE id = _animal_id AND cabaña_id = _cabana_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Animal no encontrado o no pertenece a su cabaña';
  END IF;
  
  -- Check if animal is already dead
  IF _animal_status = 'muerto' THEN
    RAISE EXCEPTION 'El animal ya está marcado como fallecido';
  END IF;
  
  -- Check if animal is sold
  IF _animal_status = 'vendido' THEN
    RAISE EXCEPTION 'No se puede marcar como fallecido un animal vendido';
  END IF;
  
  -- Validate death date
  IF _fecha_defuncion > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de defunción no puede ser futura';
  END IF;
  
  IF _birth_date IS NOT NULL AND _fecha_defuncion < _birth_date THEN
    RAISE EXCEPTION 'La fecha de defunción no puede ser anterior al nacimiento';
  END IF;
  
  -- Calculate age at death
  IF _birth_date IS NOT NULL THEN
    _edad_dias := _fecha_defuncion - _birth_date;
    _edad_meses := FLOOR(_edad_dias / 30.44);
  END IF;
  
  -- Insert death record
  INSERT INTO public.defunciones (
    animal_id, cabaña_id, fecha_defuncion, causa_id, causa_texto, 
    notas, registrado_por
  ) VALUES (
    _animal_id, _cabana_id, _fecha_defuncion, _causa_id, _causa_texto,
    _notas, _user_id
  ) RETURNING id INTO _defuncion_id;
  
  -- Update animal status
  UPDATE public.animals 
  SET 
    status = 'muerto',
    fecha_muerte = _fecha_defuncion,
    defuncion_id = _defuncion_id,
    corral_id = NULL
  WHERE id = _animal_id;
  
  -- Build result
  result := json_build_object(
    'defuncion_id', _defuncion_id,
    'animal_id', _animal_id,
    'fecha_defuncion', _fecha_defuncion,
    'edad_dias', _edad_dias,
    'edad_meses', _edad_meses,
    'success', true,
    'message', 'Animal marcado como fallecido correctamente'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;