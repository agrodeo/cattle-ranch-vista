-- Create reproductive state tracking table
CREATE TABLE IF NOT EXISTS public.reproductive_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  estado_reproductivo TEXT NOT NULL DEFAULT 'sin_preñez', -- sin_preñez, servicio_pendiente, ia_pendiente, preñez_activa, post_parto
  fecha_ultimo_servicio DATE,
  fecha_ultima_ia DATE,
  fecha_ultima_preñez DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE
);

-- Create reproductive activities table for detailed tracking
CREATE TABLE IF NOT EXISTS public.reproductive_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  tipo_actividad TEXT NOT NULL, -- servicio, inseminacion_artificial, tacto, parto, agregar_cria
  fecha_actividad DATE NOT NULL,
  resultado TEXT, -- For tacto: preñada/vacia, for parto: vivo/muerto
  detalle JSONB, -- Additional details like toro_id, proveedor, semen, etc.
  evento_id UUID, -- Link to existing eventos table if applicable
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE
);

-- Update preñeces table to match specification
ALTER TABLE public.preñeces 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'activa', -- por_servicio, por_ia, activa
ADD COLUMN IF NOT EXISTS fecha_fin DATE,
ADD COLUMN IF NOT EXISTS resultado_parto TEXT; -- vivo, muerto

-- Create configuration table for reproductive parameters
CREATE TABLE IF NOT EXISTS public.reproductive_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabaña_id UUID NOT NULL,
  edad_minima_hembra_servicio INTEGER DEFAULT 15, -- months
  gestacion_default INTEGER DEFAULT 283, -- days
  periodo_check_parto INTEGER DEFAULT 14, -- days after estimated birth
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cabaña_id)
);

-- Create verification tasks table
CREATE TABLE IF NOT EXISTS public.verification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  preñez_id UUID,
  tipo_tarea TEXT NOT NULL, -- verificar_parto, check_pregnancy
  fecha_programada DATE NOT NULL,
  estado TEXT DEFAULT 'pendiente', -- pendiente, completada, cancelada
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE,
  FOREIGN KEY (preñez_id) REFERENCES public.preñeces(id) ON DELETE CASCADE
);

-- Enable RLS on new tables
ALTER TABLE public.reproductive_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproductive_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproductive_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for reproductive_states
CREATE POLICY "Users can view reproductive states for their cabaña" 
ON public.reproductive_states FOR SELECT 
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage reproductive states" 
ON public.reproductive_states FOR ALL 
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id());

-- RLS policies for reproductive_activities
CREATE POLICY "Users can view reproductive activities for their cabaña" 
ON public.reproductive_activities FOR SELECT 
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage reproductive activities" 
ON public.reproductive_activities FOR ALL 
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id());

-- RLS policies for reproductive_config
CREATE POLICY "Users can view reproductive config for their cabaña" 
ON public.reproductive_config FOR SELECT 
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins can manage reproductive config" 
ON public.reproductive_config FOR ALL 
USING (has_role(auth.uid(), 'admin') AND cabaña_id = get_current_user_cabana_id())
WITH CHECK (has_role(auth.uid(), 'admin') AND cabaña_id = get_current_user_cabana_id());

-- RLS policies for verification_tasks
CREATE POLICY "Users can view verification tasks for their cabaña" 
ON public.verification_tasks FOR SELECT 
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage verification tasks" 
ON public.verification_tasks FOR ALL 
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id());

-- Create function to handle service/IA registration
CREATE OR REPLACE FUNCTION public.register_reproductive_activity(
  _animal_id UUID,
  _tipo_actividad TEXT,
  _fecha_actividad DATE,
  _detalle JSONB DEFAULT NULL,
  _resultado TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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
  FROM public.animals a 
  WHERE a.id = _animal_id;
  
  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Animal not found';
  END IF;
  
  -- Get reproductive configuration
  SELECT * INTO _config
  FROM public.reproductive_config 
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
  INSERT INTO public.reproductive_activities (
    animal_id, cabaña_id, tipo_actividad, fecha_actividad, resultado, detalle
  ) VALUES (
    _animal_id, _cabana_id, _tipo_actividad, _fecha_actividad, _resultado, _detalle
  ) RETURNING id INTO _activity_id;
  
  -- Handle different activity types
  IF _tipo_actividad = 'servicio' THEN
    -- Update reproductive state to servicio_pendiente
    INSERT INTO public.reproductive_states (animal_id, cabaña_id, estado_reproductivo, fecha_ultimo_servicio)
    VALUES (_animal_id, _cabana_id, 'servicio_pendiente', _fecha_actividad)
    ON CONFLICT (animal_id) 
    DO UPDATE SET 
      estado_reproductivo = 'servicio_pendiente',
      fecha_ultimo_servicio = _fecha_actividad,
      updated_at = now();
      
  ELSIF _tipo_actividad = 'inseminacion_artificial' THEN
    -- Update reproductive state to ia_pendiente
    INSERT INTO public.reproductive_states (animal_id, cabaña_id, estado_reproductivo, fecha_ultima_ia)
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
        FROM public.reproductive_states 
        WHERE animal_id = _animal_id;
        
        IF _state.estado_reproductivo = 'servicio_pendiente' THEN
          -- Create pregnancy record from service
          INSERT INTO public.preñeces (
            animal_id, cabaña_id, origen, tipo, fecha_inicio, 
            fecha_estimada_parto, estado_final
          ) VALUES (
            _animal_id, _cabana_id, 'servicio', 'por_servicio', 
            COALESCE(_state.fecha_ultimo_servicio, _fecha_actividad),
            _estimated_birth_date, 'activa'
          );
          
        ELSIF _state.estado_reproductivo = 'ia_pendiente' THEN
          -- Create pregnancy record from IA
          INSERT INTO public.preñeces (
            animal_id, cabaña_id, origen, tipo, fecha_inicio, 
            fecha_estimada_parto, estado_final
          ) VALUES (
            _animal_id, _cabana_id, 'IA', 'por_ia', 
            COALESCE(_state.fecha_ultima_ia, _fecha_actividad),
            _estimated_birth_date, 'activa'
          );
          
        ELSE
          -- Create pregnancy record from tacto only
          INSERT INTO public.preñeces (
            animal_id, cabaña_id, origen, tipo, fecha_inicio, 
            fecha_estimada_parto, estado_final
          ) VALUES (
            _animal_id, _cabana_id, 'tacto', 'activa', _fecha_actividad,
            _estimated_birth_date, 'activa'
          );
        END IF;
        
        -- Update reproductive state and animal
        UPDATE public.reproductive_states 
        SET estado_reproductivo = 'preñez_activa',
            fecha_ultima_preñez = _fecha_actividad,
            updated_at = now()
        WHERE animal_id = _animal_id;
        
        UPDATE public.animals 
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
        FROM public.reproductive_states 
        WHERE animal_id = _animal_id;
        
        IF _state.estado_reproductivo IN ('servicio_pendiente', 'ia_pendiente') THEN
          -- Mark as failed
          UPDATE public.reproductive_states 
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
      FROM public.preñeces 
      WHERE animal_id = _animal_id 
        AND estado_final = 'activa'
      ORDER BY fecha_inicio DESC 
      LIMIT 1;
      
      IF _pregnancy_id IS NOT NULL THEN
        -- Mark pregnancy as successful
        UPDATE public.preñeces 
        SET estado_final = 'exitosa',
            fecha_fin = _fecha_actividad,
            resultado_parto = _resultado
        WHERE id = _pregnancy_id;
      END IF;
      
      -- Update animal and reproductive state
      UPDATE public.animals 
      SET esta_preñada = false,
          fecha_probable_parto = NULL
      WHERE id = _animal_id;
      
      UPDATE public.reproductive_states 
      SET estado_reproductivo = 'post_parto',
          updated_at = now()
      WHERE animal_id = _animal_id;
    END;
  END IF;
  
  RETURN _activity_id;
END;
$$;