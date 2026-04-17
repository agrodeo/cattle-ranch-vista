CREATE OR REPLACE FUNCTION public.marcar_defuncion(
  _user_id uuid,
  _animal_id uuid,
  _fecha_defuncion date,
  _causa_id uuid DEFAULT NULL,
  _causa_texto text DEFAULT NULL,
  _notas text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cabana_id UUID;
  _animal_status TEXT;
  _birth_date DATE;
  _defuncion_id UUID;
  _edad_dias INTEGER;
  _edad_meses INTEGER;
  result JSON;
BEGIN
  -- Get user's cabaña_id from profiles (primary) with fallback to legacy users table
  SELECT p.cabaña_id INTO _cabana_id
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  IF _cabana_id IS NULL THEN
    SELECT u.cabaña_id INTO _cabana_id
    FROM public.users u
    WHERE u.id = _user_id
    LIMIT 1;
  END IF;

  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;

  -- Verify animal exists and belongs to user's cabaña
  SELECT a.status, a.birth_date, a.cabaña_id
  INTO _animal_status, _birth_date, _cabana_id
  FROM public.animals a
  WHERE a.id = _animal_id AND a.cabaña_id = _cabana_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Animal no encontrado o no pertenece a su cabaña';
  END IF;

  IF lower(_animal_status) IN ('muerto','muerta','dead') THEN
    RAISE EXCEPTION 'El animal ya está marcado como fallecido';
  END IF;

  IF lower(_animal_status) IN ('vendido','vendida','sold') THEN
    RAISE EXCEPTION 'No se puede marcar como fallecido un animal vendido';
  END IF;

  IF _fecha_defuncion > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de defunción no puede ser futura';
  END IF;

  IF _birth_date IS NOT NULL AND _fecha_defuncion < _birth_date THEN
    RAISE EXCEPTION 'La fecha de defunción no puede ser anterior al nacimiento';
  END IF;

  IF _birth_date IS NOT NULL THEN
    _edad_dias := _fecha_defuncion - _birth_date;
    _edad_meses := FLOOR(_edad_dias / 30.44);
  END IF;

  INSERT INTO public.defunciones (
    animal_id, cabaña_id, fecha_defuncion, causa_id, causa_texto,
    notas, registrado_por, edad_dias, edad_meses
  ) VALUES (
    _animal_id, _cabana_id, _fecha_defuncion, _causa_id, _causa_texto,
    _notas, _user_id, _edad_dias, _edad_meses
  ) RETURNING id INTO _defuncion_id;

  UPDATE public.animals
  SET
    status = 'muerto',
    fecha_muerte = _fecha_defuncion,
    defuncion_id = _defuncion_id,
    corral_id = NULL
  WHERE id = _animal_id;

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
$$;

-- Also update manage_death_causes to use profiles fallback
CREATE OR REPLACE FUNCTION public.manage_death_causes(
  _user_id uuid,
  _action text,
  _nombre text DEFAULT NULL,
  _causa_id uuid DEFAULT NULL,
  _orden integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cabana_id UUID;
  _new_id UUID;
  result JSON;
BEGIN
  SELECT p.cabaña_id INTO _cabana_id
  FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1;

  IF _cabana_id IS NULL THEN
    SELECT u.cabaña_id INTO _cabana_id
    FROM public.users u WHERE u.id = _user_id LIMIT 1;
  END IF;

  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;

  IF _action = 'list' THEN
    RETURN COALESCE(
      (SELECT json_agg(row_to_json(c) ORDER BY c.orden NULLS LAST, c.nombre)
       FROM public.catalogo_causas c
       WHERE c.cabaña_id = _cabana_id AND c.activo = true),
      '[]'::json
    );
  ELSIF _action = 'create' THEN
    INSERT INTO public.catalogo_causas (cabaña_id, nombre, orden)
    VALUES (_cabana_id, _nombre, COALESCE(_orden, 0))
    RETURNING id INTO _new_id;
    RETURN json_build_object('success', true, 'id', _new_id);
  ELSIF _action = 'update' THEN
    UPDATE public.catalogo_causas
    SET nombre = COALESCE(_nombre, nombre),
        orden = COALESCE(_orden, orden),
        updated_at = now()
    WHERE id = _causa_id AND cabaña_id = _cabana_id;
    RETURN json_build_object('success', true);
  ELSIF _action = 'deactivate' THEN
    UPDATE public.catalogo_causas
    SET activo = false, updated_at = now()
    WHERE id = _causa_id AND cabaña_id = _cabana_id;
    RETURN json_build_object('success', true);
  ELSE
    RAISE EXCEPTION 'Acción no válida: %', _action;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;