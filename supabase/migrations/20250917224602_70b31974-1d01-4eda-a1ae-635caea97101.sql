-- Core reproductive state management functions

-- Function to register service or artificial insemination
CREATE OR REPLACE FUNCTION public.register_service_activity(
  _animal_id UUID,
  _cabana_id UUID,
  _tipo_servicio TEXT, -- 'servicio' or 'inseminacion_artificial'
  _fecha_servicio DATE,
  _evento_id UUID,
  _notas TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _animal_age_months INTEGER;
  _current_state TEXT;
  _new_state TEXT;
  _history_id UUID;
BEGIN
  -- Check animal age (must be >= 15 months)
  SELECT EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date))::INTEGER
  INTO _animal_age_months
  FROM animals
  WHERE id = _animal_id AND cabaña_id = _cabana_id;
  
  IF _animal_age_months IS NULL THEN
    RAISE EXCEPTION 'Animal no encontrado';
  END IF;
  
  IF _animal_age_months < 15 THEN
    RAISE EXCEPTION 'Animal muy joven para actividades reproductivas (% meses, mínimo 15)', _animal_age_months;
  END IF;
  
  -- Get current state
  SELECT estado_actual INTO _current_state
  FROM reproductive_current_state
  WHERE animal_id = _animal_id;
  
  -- Determine new state
  IF _tipo_servicio = 'servicio' THEN
    _new_state := 'servicio_pendiente';
  ELSE
    _new_state := 'inseminacion_artificial_pendiente';
  END IF;
  
  -- Insert or update current state
  INSERT INTO reproductive_current_state (
    animal_id, cabaña_id, estado_actual, fecha_ultimo_cambio,
    fecha_servicio, tipo_servicio, evento_servicio_id, notas
  ) VALUES (
    _animal_id, _cabana_id, _new_state, _fecha_servicio,
    _fecha_servicio, _tipo_servicio, _evento_id, _notas
  )
  ON CONFLICT (animal_id) DO UPDATE SET
    estado_actual = _new_state,
    fecha_ultimo_cambio = _fecha_servicio,
    fecha_servicio = _fecha_servicio,
    tipo_servicio = _tipo_servicio,
    evento_servicio_id = _evento_id,
    notas = _notas,
    updated_at = now();
  
  -- Record state history
  INSERT INTO reproductive_state_history (
    animal_id, cabaña_id, estado_anterior, estado_nuevo,
    fecha_cambio, evento_origen_id, notas
  ) VALUES (
    _animal_id, _cabana_id, _current_state, _new_state,
    _fecha_servicio, _evento_id, _notas
  ) RETURNING id INTO _history_id;
  
  -- Update KPIs
  INSERT INTO individual_reproductive_kpis (animal_id, cabaña_id)
  VALUES (_animal_id, _cabana_id)
  ON CONFLICT (animal_id) DO NOTHING;
  
  IF _tipo_servicio = 'servicio' THEN
    UPDATE individual_reproductive_kpis
    SET total_servicios = total_servicios + 1,
        updated_at = now()
    WHERE animal_id = _animal_id;
  ELSE
    UPDATE individual_reproductive_kpis
    SET total_inseminaciones = total_inseminaciones + 1,
        updated_at = now()
    WHERE animal_id = _animal_id;
  END IF;
  
  RETURN _history_id;
END;
$function$;

-- Function to process pregnancy detection (tacto)
CREATE OR REPLACE FUNCTION public.process_pregnancy_detection(
  _animal_id UUID,
  _cabana_id UUID,
  _resultado TEXT, -- 'preñada' or 'vacia'
  _fecha_tacto DATE,
  _evento_id UUID,
  _observaciones TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_state_record RECORD;
  _new_state TEXT;
  _history_id UUID;
  _expected_calving_date DATE;
  _outcome_type TEXT;
BEGIN
  -- Get current reproductive state
  SELECT * INTO _current_state_record
  FROM reproductive_current_state
  WHERE animal_id = _animal_id;
  
  IF _current_state_record IS NULL THEN
    -- Create initial state if doesn't exist
    INSERT INTO reproductive_current_state (animal_id, cabaña_id, estado_actual)
    VALUES (_animal_id, _cabana_id, 'sin_actividad');
    
    SELECT * INTO _current_state_record
    FROM reproductive_current_state
    WHERE animal_id = _animal_id;
  END IF;
  
  IF _resultado = 'preñada' THEN
    -- Calculate expected calving date (283 days from service or detection)
    IF _current_state_record.fecha_servicio IS NOT NULL THEN
      _expected_calving_date := _current_state_record.fecha_servicio + INTERVAL '283 days';
    ELSE
      _expected_calving_date := _fecha_tacto + INTERVAL '283 days';
    END IF;
    
    -- Determine new pregnancy state based on current state
    CASE _current_state_record.estado_actual
      WHEN 'servicio_pendiente' THEN
        _new_state := 'preñada_por_servicio';
      WHEN 'inseminacion_artificial_pendiente' THEN
        _new_state := 'preñada_con_inseminacion_artificial';
      ELSE
        _new_state := 'preñez_activa';
    END CASE;
    
    -- Update current state
    UPDATE reproductive_current_state
    SET estado_actual = _new_state,
        fecha_ultimo_cambio = _fecha_tacto,
        fecha_deteccion_preñez = _fecha_tacto,
        fecha_esperada_parto = _expected_calving_date,
        evento_deteccion_id = _evento_id,
        updated_at = now()
    WHERE animal_id = _animal_id;
    
    -- Update animal table
    UPDATE animals
    SET esta_preñada = true,
        fecha_probable_parto = _expected_calving_date
    WHERE id = _animal_id;
    
    -- Update KPI
    UPDATE individual_reproductive_kpis
    SET total_preñeces_detectadas = total_preñeces_detectadas + 1,
        updated_at = now()
    WHERE animal_id = _animal_id;
    
  ELSE -- _resultado = 'vacia'
    -- Handle failed detection based on current state
    CASE _current_state_record.estado_actual
      WHEN 'servicio_pendiente' THEN
        _new_state := 'sin_actividad';
        _outcome_type := 'fallido_servicio';
        
        -- Record failed outcome
        INSERT INTO reproductive_outcomes (
          animal_id, cabaña_id, tipo_outcome, fecha_servicio,
          fecha_outcome, evento_origen_id, notas
        ) VALUES (
          _animal_id, _cabana_id, _outcome_type, _current_state_record.fecha_servicio,
          _fecha_tacto, _evento_id, _observaciones
        );
        
        -- Update KPI
        UPDATE individual_reproductive_kpis
        SET total_servicios_fallidos = total_servicios_fallidos + 1,
            updated_at = now()
        WHERE animal_id = _animal_id;
        
      WHEN 'inseminacion_artificial_pendiente' THEN
        _new_state := 'sin_actividad';
        _outcome_type := 'fallido_ia';
        
        -- Record failed outcome
        INSERT INTO reproductive_outcomes (
          animal_id, cabaña_id, tipo_outcome, fecha_servicio,
          fecha_outcome, evento_origen_id, notas
        ) VALUES (
          _animal_id, _cabana_id, _outcome_type, _current_state_record.fecha_servicio,
          _fecha_tacto, _evento_id, _observaciones
        );
        
        -- Update KPI
        UPDATE individual_reproductive_kpis
        SET total_ias_fallidas = total_ias_fallidas + 1,
            updated_at = now()
        WHERE animal_id = _animal_id;
        
      ELSE
        _new_state := _current_state_record.estado_actual; -- No change
    END CASE;
    
    -- Update current state
    UPDATE reproductive_current_state
    SET estado_actual = _new_state,
        fecha_ultimo_cambio = _fecha_tacto,
        evento_deteccion_id = _evento_id,
        updated_at = now()
    WHERE animal_id = _animal_id;
  END IF;
  
  -- Record state history
  INSERT INTO reproductive_state_history (
    animal_id, cabaña_id, estado_anterior, estado_nuevo,
    fecha_cambio, evento_origen_id, notas
  ) VALUES (
    _animal_id, _cabana_id, _current_state_record.estado_actual, _new_state,
    _fecha_tacto, _evento_id, _observaciones
  ) RETURNING id INTO _history_id;
  
  RETURN _history_id;
END;
$function$;

-- Function to process calving/birth
CREATE OR REPLACE FUNCTION public.process_calving_event(
  _mother_id UUID,
  _cabana_id UUID,
  _fecha_parto DATE,
  _cria_id UUID DEFAULT NULL,
  _evento_id UUID DEFAULT NULL,
  _notas TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_state_record RECORD;
  _new_state TEXT;
  _history_id UUID;
  _outcome_type TEXT;
  _gestation_days INTEGER;
BEGIN
  -- Get current reproductive state
  SELECT * INTO _current_state_record
  FROM reproductive_current_state
  WHERE animal_id = _mother_id;
  
  IF _current_state_record IS NULL THEN
    RAISE EXCEPTION 'No se encontró estado reproductivo para el animal';
  END IF;
  
  -- Calculate gestation days
  IF _current_state_record.fecha_servicio IS NOT NULL THEN
    _gestation_days := _fecha_parto - _current_state_record.fecha_servicio;
  END IF;
  
  -- Determine outcome type based on current state
  CASE _current_state_record.estado_actual
    WHEN 'preñada_por_servicio' THEN
      _outcome_type := 'exitoso_servicio';
    WHEN 'preñada_con_inseminacion_artificial' THEN
      _outcome_type := 'exitoso_ia';
    WHEN 'preñez_activa' THEN
      _outcome_type := 'exitoso_activa';
    ELSE
      RAISE EXCEPTION 'Estado reproductivo no válido para parto: %', _current_state_record.estado_actual;
  END CASE;
  
  _new_state := 'sin_actividad';
  
  -- Record successful outcome
  INSERT INTO reproductive_outcomes (
    animal_id, cabaña_id, tipo_outcome, fecha_servicio,
    fecha_deteccion_preñez, fecha_outcome, cria_id,
    dias_gestacion, evento_origen_id, notas
  ) VALUES (
    _mother_id, _cabana_id, _outcome_type, _current_state_record.fecha_servicio,
    _current_state_record.fecha_deteccion_preñez, _fecha_parto, _cria_id,
    _gestation_days, _evento_id, _notas
  );
  
  -- Update current state
  UPDATE reproductive_current_state
  SET estado_actual = _new_state,
      fecha_ultimo_cambio = _fecha_parto,
      fecha_servicio = NULL,
      fecha_deteccion_preñez = NULL,
      fecha_esperada_parto = NULL,
      tipo_servicio = NULL,
      evento_servicio_id = NULL,
      evento_deteccion_id = NULL,
      updated_at = now()
  WHERE animal_id = _mother_id;
  
  -- Update animal table
  UPDATE animals
  SET esta_preñada = false,
      fecha_probable_parto = NULL
  WHERE id = _mother_id;
  
  -- Update KPI
  UPDATE individual_reproductive_kpis
  SET total_partos_exitosos = total_partos_exitosos + 1,
      updated_at = now()
  WHERE animal_id = _mother_id;
  
  -- Record state history
  INSERT INTO reproductive_state_history (
    animal_id, cabaña_id, estado_anterior, estado_nuevo,
    fecha_cambio, evento_origen_id, notas
  ) VALUES (
    _mother_id, _cabana_id, _current_state_record.estado_actual, _new_state,
    _fecha_parto, _evento_id, _notas
  ) RETURNING id INTO _history_id;
  
  RETURN _history_id;
END;
$function$;