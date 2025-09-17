-- Enhanced reproductive system implementation

-- 1. Update reproductive_states table structure
ALTER TABLE public.reproductive_states 
ADD COLUMN IF NOT EXISTS fecha_servicio date,
ADD COLUMN IF NOT EXISTS fecha_ia date,
ADD COLUMN IF NOT EXISTS fecha_deteccion_preñez date,
ADD COLUMN IF NOT EXISTS notas text;

-- Update estado_reproductivo enum values
ALTER TABLE public.reproductive_states 
ALTER COLUMN estado_reproductivo TYPE text;

-- 2. Enhance preñeces table
ALTER TABLE public.preñeces 
ADD COLUMN IF NOT EXISTS tipo_origen text DEFAULT 'detectada',
ADD COLUMN IF NOT EXISTS fecha_servicio_ia date,
ADD COLUMN IF NOT EXISTS fecha_deteccion date,
ADD COLUMN IF NOT EXISTS fecha_parto_real date,
ADD COLUMN IF NOT EXISTS dias_gestacion integer;

-- Update estado_final to include new values
ALTER TABLE public.preñeces 
ALTER COLUMN estado_final TYPE text;

-- 3. Create reproductive_kpis table for caching calculations
CREATE TABLE IF NOT EXISTS public.reproductive_kpis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id uuid NOT NULL,
  cabaña_id uuid NOT NULL,
  year integer NOT NULL,
  servicios_totales integer DEFAULT 0,
  preñeces_detectadas integer DEFAULT 0,
  preñeces_exitosas integer DEFAULT 0,
  porcentaje_preñez numeric DEFAULT 0,
  porcentaje_paricion numeric DEFAULT 0,
  dias_abiertos integer,
  ultimo_parto date,
  ultimo_servicio date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(animal_id, year)
);

-- 4. Enhanced reproductive alerts
ALTER TABLE public.reproductive_alerts 
ADD COLUMN IF NOT EXISTS animal_tag text,
ADD COLUMN IF NOT EXISTS fecha_limite date,
ADD COLUMN IF NOT EXISTS prioridad text DEFAULT 'media';

-- 5. Function to register reproductive activities (services/IA)
CREATE OR REPLACE FUNCTION public.register_reproductive_activity(
  _animal_id uuid,
  _tipo_actividad text, -- 'servicio' or 'inseminacion_artificial'
  _fecha_actividad date,
  _cabana_id uuid,
  _detalle jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _state_id uuid;
  _animal_age_months integer;
BEGIN
  -- Verify animal is eligible (≥15 months)
  SELECT EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date))
  INTO _animal_age_months
  FROM animals 
  WHERE id = _animal_id;
  
  IF _animal_age_months < 15 THEN
    RAISE EXCEPTION 'Animal debe tener al menos 15 meses para actividades reproductivas';
  END IF;
  
  -- Update or create reproductive state
  INSERT INTO reproductive_states (
    animal_id, cabaña_id, estado_reproductivo, 
    fecha_servicio, fecha_ia, updated_at
  ) VALUES (
    _animal_id, _cabana_id,
    CASE WHEN _tipo_actividad = 'servicio' THEN 'servicio_pendiente'
         ELSE 'ia_pendiente' END,
    CASE WHEN _tipo_actividad = 'servicio' THEN _fecha_actividad ELSE NULL END,
    CASE WHEN _tipo_actividad = 'inseminacion_artificial' THEN _fecha_actividad ELSE NULL END,
    now()
  )
  ON CONFLICT (animal_id) 
  DO UPDATE SET 
    estado_reproductivo = CASE WHEN _tipo_actividad = 'servicio' THEN 'servicio_pendiente'
                              ELSE 'ia_pendiente' END,
    fecha_servicio = CASE WHEN _tipo_actividad = 'servicio' THEN _fecha_actividad 
                         ELSE reproductive_states.fecha_servicio END,
    fecha_ia = CASE WHEN _tipo_actividad = 'inseminacion_artificial' THEN _fecha_actividad 
                   ELSE reproductive_states.fecha_ia END,
    updated_at = now()
  RETURNING id INTO _state_id;
  
  RETURN _state_id;
END;
$$;

-- 6. Function to process pregnancy detection (tactos)
CREATE OR REPLACE FUNCTION public.process_pregnancy_detection(
  _animal_id uuid,
  _fecha_tacto date,
  _resultado text, -- 'preñada' or 'vacia'
  _cabana_id uuid,
  _observaciones text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_state RECORD;
  _pregnancy_id uuid;
  _fecha_parto_esperada date;
  _new_state text;
  _tipo_origen text;
  _fecha_servicio_ia date;
BEGIN
  -- Get current reproductive state
  SELECT * INTO _current_state
  FROM reproductive_states 
  WHERE animal_id = _animal_id;
  
  IF _resultado = 'preñada' THEN
    -- Determine pregnancy type and origin
    IF _current_state.estado_reproductivo = 'servicio_pendiente' THEN
      _new_state := 'preñez_servicio';
      _tipo_origen := 'servicio';
      _fecha_servicio_ia := _current_state.fecha_servicio;
    ELSIF _current_state.estado_reproductivo = 'ia_pendiente' THEN
      _new_state := 'preñez_ia';
      _tipo_origen := 'ia';
      _fecha_servicio_ia := _current_state.fecha_ia;
    ELSE
      _new_state := 'preñez_activa';
      _tipo_origen := 'detectada';
      _fecha_servicio_ia := NULL;
    END IF;
    
    -- Calculate expected calving date
    _fecha_parto_esperada := _fecha_tacto + INTERVAL '283 days';
    
    -- Create pregnancy record
    INSERT INTO preñeces (
      animal_id, cabaña_id, tipo_origen, estado_final,
      fecha_inicio, fecha_deteccion, fecha_estimada_parto,
      fecha_servicio_ia, notas
    ) VALUES (
      _animal_id, _cabana_id, _tipo_origen, 'activa',
      COALESCE(_fecha_servicio_ia, _fecha_tacto), _fecha_tacto, _fecha_parto_esperada,
      _fecha_servicio_ia, _observaciones
    ) RETURNING id INTO _pregnancy_id;
    
    -- Update animal pregnancy status
    UPDATE animals 
    SET esta_preñada = true,
        fecha_probable_parto = _fecha_parto_esperada,
        fecha_ultima_preñez = _fecha_tacto
    WHERE id = _animal_id;
    
  ELSE -- _resultado = 'vacia'
    -- Handle negative pregnancy detection
    IF _current_state.estado_reproductivo = 'servicio_pendiente' THEN
      _new_state := 'servicio_fallido';
    ELSIF _current_state.estado_reproductivo = 'ia_pendiente' THEN
      _new_state := 'ia_fallida';
    ELSE
      _new_state := _current_state.estado_reproductivo; -- No change
    END IF;
  END IF;
  
  -- Update reproductive state
  UPDATE reproductive_states 
  SET estado_reproductivo = _new_state,
      fecha_deteccion_preñez = _fecha_tacto,
      notas = _observaciones,
      updated_at = now()
  WHERE animal_id = _animal_id;
  
  RETURN COALESCE(_pregnancy_id, _current_state.id);
END;
$$;

-- 7. Function to register calving events
CREATE OR REPLACE FUNCTION public.register_calving_event(
  _mother_id uuid,
  _calf_id uuid DEFAULT NULL,
  _fecha_parto date DEFAULT CURRENT_DATE,
  _cabana_id uuid DEFAULT NULL,
  _observaciones text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _pregnancy_record RECORD;
  _dias_gestacion integer;
  _estado_final text;
BEGIN
  -- Find active pregnancy
  SELECT * INTO _pregnancy_record
  FROM preñeces 
  WHERE animal_id = _mother_id 
    AND estado_final = 'activa'
  ORDER BY fecha_inicio DESC 
  LIMIT 1;
  
  IF _pregnancy_record IS NULL THEN
    RAISE EXCEPTION 'No se encontró preñez activa para este animal';
  END IF;
  
  -- Calculate gestation days
  _dias_gestacion := _fecha_parto - _pregnancy_record.fecha_inicio;
  
  -- Determine final state based on pregnancy type
  _estado_final := CASE 
    WHEN _pregnancy_record.tipo_origen = 'servicio' THEN 'exitosa_servicio'
    WHEN _pregnancy_record.tipo_origen = 'ia' THEN 'exitosa_ia'
    ELSE 'exitosa'
  END;
  
  -- Update pregnancy record
  UPDATE preñeces 
  SET estado_final = _estado_final,
      fecha_finalizacion = _fecha_parto,
      fecha_parto_real = _fecha_parto,
      cria_id = _calf_id,
      dias_gestacion = _dias_gestacion,
      motivo_finalizacion = 'parto_exitoso'
  WHERE id = _pregnancy_record.id;
  
  -- Update mother's status
  UPDATE animals 
  SET esta_preñada = false,
      fecha_probable_parto = NULL
  WHERE id = _mother_id;
  
  -- Update reproductive state
  UPDATE reproductive_states 
  SET estado_reproductivo = 'post_parto',
      updated_at = now()
  WHERE animal_id = _mother_id;
  
  RETURN _pregnancy_record.id;
END;
$$;

-- 8. Function to check overdue pregnancies and create alerts
CREATE OR REPLACE FUNCTION public.check_overdue_pregnancies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  overdue_record RECORD;
BEGIN
  -- Check pregnancies overdue by 14+ days
  FOR overdue_record IN
    SELECT p.id, p.animal_id, p.cabaña_id, p.fecha_estimada_parto, 
           a.id_tag, a.name,
           CURRENT_DATE - p.fecha_estimada_parto as dias_vencido
    FROM preñeces p
    JOIN animals a ON p.animal_id = a.id
    WHERE p.estado_final = 'activa'
      AND p.fecha_estimada_parto + INTERVAL '14 days' < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM reproductive_alerts ra 
        WHERE ra.animal_id = p.animal_id 
          AND ra.alert_type = 'parto_vencido'
          AND ra.status = 'pending'
      )
  LOOP
    -- Create overdue calving alert
    INSERT INTO reproductive_alerts (
      animal_id, cabaña_id, alert_type, expected_date, 
      days_overdue, animal_tag, fecha_limite, prioridad,
      notes
    ) VALUES (
      overdue_record.animal_id,
      overdue_record.cabaña_id,
      'parto_vencido',
      overdue_record.fecha_estimada_parto,
      overdue_record.dias_vencido,
      overdue_record.id_tag,
      CURRENT_DATE + INTERVAL '7 days',
      'alta',
      'Confirmar parto o marcar pérdida de preñez - ' || overdue_record.dias_vencido || ' días vencido'
    );
  END LOOP;
END;
$$;

-- 9. Enable RLS policies for new table
ALTER TABLE public.reproductive_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view KPIs for their cabaña" ON public.reproductive_kpis
  FOR SELECT USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins can manage KPIs for their cabaña" ON public.reproductive_kpis
  FOR ALL USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
    AND cabaña_id = get_current_user_cabana_id()
  );

-- 10. Create triggers for automatic KPI updates
CREATE OR REPLACE FUNCTION public.update_reproductive_kpis_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _year integer := EXTRACT(YEAR FROM CURRENT_DATE);
  _cabana_id uuid;
BEGIN
  -- Get cabaña_id
  IF TG_TABLE_NAME = 'animals' THEN
    _cabana_id := COALESCE(NEW.cabaña_id, OLD.cabaña_id);
  ELSIF TG_TABLE_NAME = 'preñeces' THEN
    _cabana_id := COALESCE(NEW.cabaña_id, OLD.cabaña_id);
  END IF;
  
  -- Trigger KPI recalculation (async)
  -- This would be handled by a background job in production
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS update_kpis_on_pregnancy ON preñeces;
CREATE TRIGGER update_kpis_on_pregnancy
  AFTER INSERT OR UPDATE OR DELETE ON preñeces
  FOR EACH ROW EXECUTE FUNCTION update_reproductive_kpis_on_event();

DROP TRIGGER IF EXISTS update_kpis_on_animal_change ON animals;
CREATE TRIGGER update_kpis_on_animal_change
  AFTER UPDATE OF esta_preñada ON animals
  FOR EACH ROW EXECUTE FUNCTION update_reproductive_kpis_on_event();