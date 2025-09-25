-- Fix remaining database functions security issues - Add SET search_path = 'public'

-- Fix all remaining functions that are missing search_path

CREATE OR REPLACE FUNCTION public.register_reproductive_activity(_animal_id uuid, _tipo_actividad text, _fecha_actividad date, _detalle jsonb DEFAULT NULL::jsonb, _resultado text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _cabana_id UUID;
  _activity_id UUID;
  _config RECORD;
  _animal_age_months INTEGER;
  _estimated_birth_date DATE;
BEGIN
  -- Get animal's cabaña and age
  SELECT a.cabaña_id, 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER
  INTO _cabana_id, _animal_age_months
  FROM animals a 
  WHERE a.id = _animal_id;
  
  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Animal not found';
  END IF;
  
  -- Get reproductive configuration
  SELECT * INTO _config
  FROM reproductive_config 
  WHERE cabaña_id = _cabana_id;
  
  -- Use defaults if no config exists
  IF _config IS NULL THEN
    _config.edad_minima_hembra_servicio := 15;
    _config.gestacion_default := 283;
    _config.periodo_check_parto := 14;
  END IF;
  
  -- Check if animal is eligible for reproductive activities
  IF _animal_age_months < _config.edad_minima_hembra_servicio THEN
    RAISE EXCEPTION 'Animal too young for reproductive activities (% months, minimum %)', 
      _animal_age_months, _config.edad_minima_hembra_servicio;
  END IF;
  
  -- Insert reproductive activity
  INSERT INTO reproductive_activities (
    animal_id, cabaña_id, tipo_actividad, fecha_actividad, resultado, detalle
  ) VALUES (
    _animal_id, _cabana_id, _tipo_actividad, _fecha_actividad, _resultado, _detalle
  ) RETURNING id INTO _activity_id;
  
  -- Handle different activity types
  IF _tipo_actividad = 'servicio' THEN
    -- Update reproductive state to servicio_pendiente
    INSERT INTO reproductive_states (animal_id, cabaña_id, estado_reproductivo, fecha_ultimo_servicio)
    VALUES (_animal_id, _cabana_id, 'servicio_pendiente', _fecha_actividad)
    ON CONFLICT (animal_id) 
    DO UPDATE SET 
      estado_reproductivo = 'servicio_pendiente',
      fecha_ultimo_servicio = _fecha_actividad,
      updated_at = now();
      
  ELSIF _tipo_actividad = 'inseminacion_artificial' THEN
    -- Update reproductive state to ia_pendiente
    INSERT INTO reproductive_states (animal_id, cabaña_id, estado_reproductivo, fecha_ultima_ia)
    VALUES (_animal_id, _cabana_id, 'ia_pendiente', _fecha_actividad)
    ON CONFLICT (animal_id) 
    DO UPDATE SET 
      estado_reproductivo = 'ia_pendiente',
      fecha_ultima_ia = _fecha_actividad,
      updated_at = now();
      
  ELSIF _tipo_actividad = 'tacto' THEN
    IF _resultado = 'preñada' THEN
      -- Handle pregnancy confirmation
      _estimated_birth_date := _fecha_actividad + _config.gestacion_default;
      
      -- Check for pending services or IA
      DECLARE
        _state RECORD;
      BEGIN
        SELECT * INTO _state 
        FROM reproductive_states 
        WHERE animal_id = _animal_id;
        
        IF _state.estado_reproductivo = 'servicio_pendiente' THEN
          -- Create pregnancy record from service
          INSERT INTO preñeces (
            animal_id, cabaña_id, origen, tipo, fecha_inicio, 
            fecha_estimada_parto, estado_final
          ) VALUES (
            _animal_id, _cabana_id, 'servicio', 'por_servicio', 
            COALESCE(_state.fecha_ultimo_servicio, _fecha_actividad),
            _estimated_birth_date, 'activa'
          );
          
        ELSIF _state.estado_reproductivo = 'ia_pendiente' THEN
          -- Create pregnancy record from IA
          INSERT INTO preñeces (
            animal_id, cabaña_id, origen, tipo, fecha_inicio, 
            fecha_estimada_parto, estado_final
          ) VALUES (
            _animal_id, _cabana_id, 'IA', 'por_ia', 
            COALESCE(_state.fecha_ultima_ia, _fecha_actividad),
            _estimated_birth_date, 'activa'
          );
          
        ELSE
          -- Create pregnancy record from tacto only
          INSERT INTO preñeces (
            animal_id, cabaña_id, origen, tipo, fecha_inicio, 
            fecha_estimada_parto, estado_final
          ) VALUES (
            _animal_id, _cabana_id, 'tacto', 'activa', _fecha_actividad,
            _estimated_birth_date, 'activa'
          );
        END IF;
        
        -- Update reproductive state and animal
        UPDATE reproductive_states 
        SET estado_reproductivo = 'preñez_activa',
            fecha_ultima_preñez = _fecha_actividad,
            updated_at = now()
        WHERE animal_id = _animal_id;
        
        UPDATE animals 
        SET esta_preñada = true,
            fecha_probable_parto = _estimated_birth_date
        WHERE id = _animal_id;
      END;
      
    ELSIF _resultado = 'vacia' THEN
      -- Handle empty diagnosis - mark pending services as failed
      DECLARE
        _state RECORD;
      BEGIN
        SELECT * INTO _state 
        FROM reproductive_states 
        WHERE animal_id = _animal_id;
        
        IF _state.estado_reproductivo IN ('servicio_pendiente', 'ia_pendiente') THEN
          -- Mark as failed
          UPDATE reproductive_states 
          SET estado_reproductivo = 'sin_preñez',
              updated_at = now()
          WHERE animal_id = _animal_id;
        END IF;
      END;
    END IF;
    
  ELSIF _tipo_actividad = 'parto' THEN
    -- Handle birth/calving
    DECLARE
      _pregnancy_id UUID;
    BEGIN
      -- Find active pregnancy
      SELECT id INTO _pregnancy_id
      FROM preñeces 
      WHERE animal_id = _animal_id 
        AND estado_final = 'activa'
      ORDER BY fecha_inicio DESC 
      LIMIT 1;
      
      IF _pregnancy_id IS NOT NULL THEN
        -- Mark pregnancy as successful
        UPDATE preñeces 
        SET estado_final = 'exitosa',
            fecha_fin = _fecha_actividad,
            resultado_parto = _resultado
        WHERE id = _pregnancy_id;
      END IF;
      
      -- Update animal and reproductive state
      UPDATE animals 
      SET esta_preñada = false,
          fecha_probable_parto = NULL
      WHERE id = _animal_id;
      
      UPDATE reproductive_states 
      SET estado_reproductivo = 'post_parto',
          updated_at = now()
      WHERE animal_id = _animal_id;
    END;
  END IF;
  
  RETURN _activity_id;
END;
$function$;

-- Continue with other functions...
CREATE OR REPLACE FUNCTION public.get_plan_limits(plan_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN CASE plan_code
    WHEN 'personal' THEN '{"max_animals": 200, "max_users": 3}'::jsonb
    WHEN 'productor' THEN '{"max_animals": 1000, "max_users": 5}'::jsonb
    WHEN 'cabana' THEN '{"max_animals": 5000, "max_users": 15}'::jsonb
    WHEN 'corporativo' THEN '{"max_animals": 999999, "max_users": 999999}'::jsonb
    ELSE '{"max_animals": 50, "max_users": 2}'::jsonb
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_password(_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Mark passwords for server-side hashing
  -- The actual hashing will be done in edge functions
  RETURN 'bcrypt_placeholder:' || _password;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event('role_assigned', 'user_roles', NEW.id, 
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_security_event('role_changed', 'user_roles', NEW.id,
      jsonb_build_object('user_id', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_security_event('role_removed', 'user_roles', OLD.id,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_finance_recurring(_user_id uuid)
RETURNS TABLE(id uuid, "cabaña_id" uuid, amount numeric, category_id uuid, start_date date, end_date date, next_run_date date, last_run_date date, day_of_month integer, day_of_week integer, interval_days integer, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, description text, frequency text, name text, type text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  WITH user_cab AS (
    SELECT cabana_id FROM get_user_cabana_info(_user_id) LIMIT 1
  )
  SELECT 
    fr.id,
    fr."cabaña_id",
    fr.amount,
    fr.category_id,
    fr.start_date,
    fr.end_date,
    fr.next_run_date,
    fr.last_run_date,
    fr.day_of_month,
    fr.day_of_week,
    fr.interval_days,
    fr.is_active,
    fr.created_at,
    fr.updated_at,
    fr.description,
    fr.frequency,
    fr.name,
    fr.type
  FROM finance_recurring fr, user_cab
  WHERE fr."cabaña_id" = user_cab.cabana_id
  ORDER BY fr.created_at DESC;
$function$;