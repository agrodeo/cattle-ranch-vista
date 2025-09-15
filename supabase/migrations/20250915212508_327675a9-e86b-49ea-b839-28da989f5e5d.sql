-- Fix reproductive_states table to have unique constraint for animal_id
ALTER TABLE public.reproductive_states 
ADD CONSTRAINT reproductive_states_animal_id_unique UNIQUE (animal_id);

-- Fix search path for the register_reproductive_activity function
CREATE OR REPLACE FUNCTION public.register_reproductive_activity(
  _animal_id UUID,
  _tipo_actividad TEXT,
  _fecha_actividad DATE,
  _detalle JSONB DEFAULT NULL,
  _resultado TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Create function to calculate reproductive KPIs
CREATE OR REPLACE FUNCTION public.calculate_reproductive_kpis(
  _cabana_id UUID,
  _date_from DATE DEFAULT NULL,
  _date_to DATE DEFAULT NULL,
  _corral_ids UUID[] DEFAULT NULL
) RETURNS TABLE(
  animal_id UUID,
  tag TEXT,
  name TEXT,
  category TEXT,
  corral_name TEXT,
  is_pregnant BOOLEAN,
  pregnancy_rate NUMERIC,
  calving_rate NUMERIC,
  total_services INTEGER,
  total_pregnancies INTEGER,
  successful_pregnancies INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set default date range if not provided
  IF _date_from IS NULL THEN
    _date_from := CURRENT_DATE - INTERVAL '365 days';
  END IF;
  IF _date_to IS NULL THEN
    _date_to := CURRENT_DATE;
  END IF;
  
  RETURN QUERY
  WITH reproductive_females AS (
    SELECT 
      a.id as animal_id,
      a.id_tag as tag,
      a.name,
      a.esta_preñada,
      c.name as corral_name,
      CASE 
        WHEN a.birth_date IS NULL THEN 'Desconocido'
        WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) < 15 THEN 'Ternera'
        WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) < 36 THEN 'Vaquillona'
        ELSE 'Vaca'
      END as category
    FROM animals a
    LEFT JOIN corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = _cabana_id
      AND a.sex = 'Hembra'
      AND a.status NOT IN ('vendido', 'muerto')
      AND (a.birth_date IS NULL OR EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 15)
      AND (_corral_ids IS NULL OR a.corral_id = ANY(_corral_ids))
  ),
  activity_counts AS (
    SELECT 
      rf.animal_id,
      COUNT(CASE WHEN ra.tipo_actividad IN ('servicio', 'inseminacion_artificial') 
                  AND ra.fecha_actividad BETWEEN _date_from AND _date_to 
                 THEN 1 END) as services_count,
      COUNT(CASE WHEN p.estado_final = 'activa' THEN 1 END) as active_pregnancies,
      COUNT(CASE WHEN p.estado_final = 'exitosa' 
                  AND p.fecha_inicio BETWEEN _date_from AND _date_to 
                 THEN 1 END) as successful_pregnancies,
      COUNT(CASE WHEN p.estado_final IN ('activa', 'exitosa', 'fallida') 
                  AND p.fecha_inicio BETWEEN _date_from AND _date_to 
                 THEN 1 END) as total_pregnancies
    FROM reproductive_females rf
    LEFT JOIN reproductive_activities ra ON rf.animal_id = ra.animal_id
    LEFT JOIN preñeces p ON rf.animal_id = p.animal_id
    GROUP BY rf.animal_id
  )
  SELECT 
    rf.animal_id,
    rf.tag,
    rf.name,
    rf.category,
    rf.corral_name,
    rf.esta_preñada as is_pregnant,
    CASE 
      WHEN ac.services_count > 0 
      THEN ROUND((ac.total_pregnancies::NUMERIC / ac.services_count::NUMERIC) * 100, 1)
      ELSE 0 
    END as pregnancy_rate,
    CASE 
      WHEN ac.total_pregnancies > 0 
      THEN ROUND((ac.successful_pregnancies::NUMERIC / ac.total_pregnancies::NUMERIC) * 100, 1)
      ELSE 0 
    END as calving_rate,
    ac.services_count::INTEGER as total_services,
    ac.total_pregnancies::INTEGER,
    ac.successful_pregnancies::INTEGER
  FROM reproductive_females rf
  JOIN activity_counts ac ON rf.animal_id = ac.animal_id
  ORDER BY rf.tag;
END;
$$;