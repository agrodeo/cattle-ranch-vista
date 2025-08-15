-- 1. Create generic events table for audit trail and recent activities
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cabaña_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('IA', 'TACTO', 'VACUNACION', 'PESAJE', 'GENERAL')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  creado_por UUID NOT NULL,
  notas TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- RLS policies for eventos
CREATE POLICY "Users can view eventos for their cabana" ON public.eventos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND cabaña_id = eventos.cabaña_id)
  );

CREATE POLICY "Users can insert eventos for their cabana" ON public.eventos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND cabaña_id = eventos.cabaña_id)
  );

-- 2. Create AI (artificial insemination) table
CREATE TABLE IF NOT EXISTS public.ia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,
  toro_id UUID, -- Optional reference to bulls table
  toro_nombre TEXT NOT NULL,
  raza_toro TEXT,
  extras_toro JSONB, -- Additional bull details like horns, weight, etc.
  animales_ids UUID[] NOT NULL, -- Array of female animal IDs
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ia ENABLE ROW LEVEL SECURITY;

-- RLS policies for ia
CREATE POLICY "Users can view ia for their cabana" ON public.ia
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.eventos e 
      JOIN public.users u ON u.id = auth.uid() 
      WHERE e.id = ia.evento_id AND e.cabaña_id = u.cabaña_id
    )
  );

CREATE POLICY "Users can insert ia for their cabana" ON public.ia
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.eventos e 
      JOIN public.users u ON u.id = auth.uid() 
      WHERE e.id = ia.evento_id AND e.cabaña_id = u.cabaña_id
    )
  );

-- 3. Create tactos (pregnancy detection) table
CREATE TABLE IF NOT EXISTS public.tactos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,
  resultados JSONB NOT NULL, -- Array of {animal_id, resultado('preñada'|'vacia'), feto_dias?}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tactos ENABLE ROW LEVEL SECURITY;

-- RLS policies for tactos
CREATE POLICY "Users can view tactos for their cabana" ON public.tactos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.eventos e 
      JOIN public.users u ON u.id = auth.uid() 
      WHERE e.id = tactos.evento_id AND e.cabaña_id = u.cabaña_id
    )
  );

CREATE POLICY "Users can insert tactos for their cabana" ON public.tactos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.eventos e 
      JOIN public.users u ON u.id = auth.uid() 
      WHERE e.id = tactos.evento_id AND e.cabaña_id = u.cabaña_id
    )
  );

-- 4. Create pesajes (weighing) table
CREATE TABLE IF NOT EXISTS public.pesajes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,
  mediciones JSONB NOT NULL, -- Array of {animal_id, peso_kg}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pesajes ENABLE ROW LEVEL SECURITY;

-- RLS policies for pesajes
CREATE POLICY "Users can view pesajes for their cabana" ON public.pesajes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.eventos e 
      JOIN public.users u ON u.id = auth.uid() 
      WHERE e.id = pesajes.evento_id AND e.cabaña_id = u.cabaña_id
    )
  );

CREATE POLICY "Users can insert pesajes for their cabana" ON public.pesajes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.eventos e 
      JOIN public.users u ON u.id = auth.uid() 
      WHERE e.id = pesajes.evento_id AND e.cabaña_id = u.cabaña_id
    )
  );

-- 5. Create vacunaciones table
CREATE TABLE IF NOT EXISTS public.vacunaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,
  vacuna TEXT NOT NULL,
  lote TEXT,
  dosis TEXT,
  via TEXT,
  proxima_dosis DATE,
  animales_ids UUID[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vacunaciones ENABLE ROW LEVEL SECURITY;

-- RLS policies for vacunaciones
CREATE POLICY "Users can view vacunaciones for their cabana" ON public.vacunaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.eventos e 
      JOIN public.users u ON u.id = auth.uid() 
      WHERE e.id = vacunaciones.evento_id AND e.cabaña_id = u.cabaña_id
    )
  );

CREATE POLICY "Users can insert vacunaciones for their cabana" ON public.vacunaciones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.eventos e 
      JOIN public.users u ON u.id = auth.uid() 
      WHERE e.id = vacunaciones.evento_id AND e.cabaña_id = u.cabaña_id
    )
  );

-- 6. Create vacunas_historial (denormalized vaccination history per animal)
CREATE TABLE IF NOT EXISTS public.vacunas_historial (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  vacuna TEXT NOT NULL,
  fecha DATE NOT NULL,
  lote TEXT,
  dosis TEXT,
  via TEXT,
  proxima_dosis DATE,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vacunas_historial ENABLE ROW LEVEL SECURITY;

-- RLS policies for vacunas_historial
CREATE POLICY "Users can view vacunas_historial for their cabana" ON public.vacunas_historial
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND cabaña_id = vacunas_historial.cabaña_id)
  );

CREATE POLICY "Users can insert vacunas_historial for their cabana" ON public.vacunas_historial
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND cabaña_id = vacunas_historial.cabaña_id)
  );

-- 7. Create preñeces (pregnancy state per animal/cycle)
CREATE TABLE IF NOT EXISTS public.preñeces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  origen TEXT NOT NULL CHECK (origen IN ('IA', 'MONTA', 'TACTO')),
  fecha_inicio DATE NOT NULL,
  fecha_estimada_parto DATE,
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'confirmada', 'paricion_viva', 'perdida', 'nacido_muerto')) DEFAULT 'pendiente',
  evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.preñeces ENABLE ROW LEVEL SECURITY;

-- RLS policies for preñeces
CREATE POLICY "Users can view preñeces for their cabana" ON public.preñeces
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND cabaña_id = preñeces.cabaña_id)
  );

CREATE POLICY "Users can insert preñeces for their cabana" ON public.preñeces
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND cabaña_id = preñeces.cabaña_id)
  );

CREATE POLICY "Users can update preñeces for their cabana" ON public.preñeces
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND cabaña_id = preñeces.cabaña_id)
  );

-- 8. Add new columns to animals table for tracking current state
ALTER TABLE public.animals 
ADD COLUMN IF NOT EXISTS esta_preñada BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_ultima_preñez DATE,
ADD COLUMN IF NOT EXISTS fecha_probable_parto DATE,
ADD COLUMN IF NOT EXISTS peso_actual_kg NUMERIC,
ADD COLUMN IF NOT EXISTS fecha_ultimo_pesaje DATE,
ADD COLUMN IF NOT EXISTS ganancia_diaria_kg NUMERIC;

-- 9. Create triggers for automatic updates

-- Function to update animal pregnancy status after tactos
CREATE OR REPLACE FUNCTION public.actualizar_estado_preñez()
RETURNS TRIGGER AS $$
DECLARE
  resultado_animal JSONB;
  animal_id_actual UUID;
  resultado_actual TEXT;
  user_cabana_id UUID;
BEGIN
  -- Get user's cabana_id
  SELECT cabaña_id INTO user_cabana_id 
  FROM public.users 
  WHERE id = auth.uid() 
  LIMIT 1;

  -- Process each result in the tacto
  FOR resultado_animal IN SELECT jsonb_array_elements(NEW.resultados)
  LOOP
    animal_id_actual := (resultado_animal->>'animal_id')::UUID;
    resultado_actual := resultado_animal->>'resultado';
    
    -- Update animal pregnancy status
    IF resultado_actual = 'preñada' THEN
      UPDATE public.animals 
      SET esta_preñada = TRUE,
          fecha_ultima_preñez = (SELECT fecha FROM public.eventos WHERE id = NEW.evento_id)
      WHERE id = animal_id_actual;
      
      -- Update or create pregnancy record
      UPDATE public.preñeces 
      SET estado = 'confirmada',
          updated_at = now()
      WHERE animal_id = animal_id_actual 
        AND estado = 'pendiente'
        AND cabaña_id = user_cabana_id;
        
    ELSE -- 'vacia'
      UPDATE public.animals 
      SET esta_preñada = FALSE
      WHERE id = animal_id_actual;
      
      -- Mark pending pregnancies as lost
      UPDATE public.preñeces 
      SET estado = 'perdida',
          updated_at = now()
      WHERE animal_id = animal_id_actual 
        AND estado IN ('pendiente', 'confirmada')
        AND cabaña_id = user_cabana_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for tactos
DROP TRIGGER IF EXISTS trigger_actualizar_estado_preñez ON public.tactos;
CREATE TRIGGER trigger_actualizar_estado_preñez
  AFTER INSERT ON public.tactos
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_estado_preñez();

-- Function to create pregnancy records after AI
CREATE OR REPLACE FUNCTION public.crear_preñeces_ia()
RETURNS TRIGGER AS $$
DECLARE
  animal_id_actual UUID;
  fecha_ia DATE;
  user_cabana_id UUID;
BEGIN
  -- Get user's cabana_id and IA date
  SELECT u.cabaña_id, e.fecha 
  INTO user_cabana_id, fecha_ia
  FROM public.users u, public.eventos e
  WHERE u.id = auth.uid() AND e.id = NEW.evento_id
  LIMIT 1;

  -- Create pregnancy record for each female
  FOREACH animal_id_actual IN ARRAY NEW.animales_ids
  LOOP
    INSERT INTO public.preñeces (
      animal_id, 
      cabaña_id, 
      origen, 
      fecha_inicio, 
      fecha_estimada_parto,
      estado, 
      evento_id
    ) VALUES (
      animal_id_actual,
      user_cabana_id,
      'IA',
      fecha_ia,
      fecha_ia + INTERVAL '283 days',
      'pendiente',
      NEW.evento_id
    )
    ON CONFLICT DO NOTHING; -- Avoid duplicates
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for IA
DROP TRIGGER IF EXISTS trigger_crear_preñeces_ia ON public.ia;
CREATE TRIGGER trigger_crear_preñeces_ia
  AFTER INSERT ON public.ia
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_preñeces_ia();

-- Function to update animal weights after weighing
CREATE OR REPLACE FUNCTION public.actualizar_pesos()
RETURNS TRIGGER AS $$
DECLARE
  medicion_animal JSONB;
  animal_id_actual UUID;
  peso_actual NUMERIC;
  fecha_pesaje DATE;
  peso_anterior NUMERIC;
  fecha_anterior DATE;
  dias_diferencia INTEGER;
  ganancia_diaria NUMERIC;
BEGIN
  -- Get weighing date
  SELECT fecha INTO fecha_pesaje 
  FROM public.eventos 
  WHERE id = NEW.evento_id;

  -- Process each measurement
  FOR medicion_animal IN SELECT jsonb_array_elements(NEW.mediciones)
  LOOP
    animal_id_actual := (medicion_animal->>'animal_id')::UUID;
    peso_actual := (medicion_animal->>'peso_kg')::NUMERIC;
    
    -- Get previous weight for daily gain calculation
    SELECT peso_actual_kg, fecha_ultimo_pesaje 
    INTO peso_anterior, fecha_anterior
    FROM public.animals 
    WHERE id = animal_id_actual;
    
    -- Calculate daily gain if there's a previous weighing
    ganancia_diaria := NULL;
    IF peso_anterior IS NOT NULL AND fecha_anterior IS NOT NULL THEN
      dias_diferencia := fecha_pesaje - fecha_anterior;
      IF dias_diferencia > 0 THEN
        ganancia_diaria := (peso_actual - peso_anterior) / dias_diferencia;
      END IF;
    END IF;
    
    -- Update animal weight data
    UPDATE public.animals 
    SET peso_actual_kg = peso_actual,
        fecha_ultimo_pesaje = fecha_pesaje,
        ganancia_diaria_kg = ganancia_diaria
    WHERE id = animal_id_actual;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for weighing
DROP TRIGGER IF EXISTS trigger_actualizar_pesos ON public.pesajes;
CREATE TRIGGER trigger_actualizar_pesos
  AFTER INSERT ON public.pesajes
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_pesos();

-- Function to create vaccination history records
CREATE OR REPLACE FUNCTION public.crear_historial_vacunas()
RETURNS TRIGGER AS $$
DECLARE
  animal_id_actual UUID;
  fecha_vacuna DATE;
  user_cabana_id UUID;
BEGIN
  -- Get vaccination date and user's cabana
  SELECT e.fecha, u.cabaña_id
  INTO fecha_vacuna, user_cabana_id
  FROM public.eventos e, public.users u
  WHERE e.id = NEW.evento_id AND u.id = auth.uid()
  LIMIT 1;

  -- Create vaccination history record for each animal
  FOREACH animal_id_actual IN ARRAY NEW.animales_ids
  LOOP
    INSERT INTO public.vacunas_historial (
      animal_id,
      cabaña_id,
      vacuna,
      fecha,
      lote,
      dosis,
      via,
      proxima_dosis,
      evento_id
    ) VALUES (
      animal_id_actual,
      user_cabana_id,
      NEW.vacuna,
      fecha_vacuna,
      NEW.lote,
      NEW.dosis,
      NEW.via,
      NEW.proxima_dosis,
      NEW.evento_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for vaccinations
DROP TRIGGER IF EXISTS trigger_crear_historial_vacunas ON public.vacunaciones;
CREATE TRIGGER trigger_crear_historial_vacunas
  AFTER INSERT ON public.vacunaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_historial_vacunas();

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_eventos_cabana_tipo_fecha ON public.eventos(cabaña_id, tipo, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_vacunas_historial_animal_vacuna ON public.vacunas_historial(animal_id, vacuna, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_preñeces_animal_estado ON public.preñeces(animal_id, estado);
CREATE INDEX IF NOT EXISTS idx_animals_cabana_status ON public.animals(cabaña_id, status) WHERE status IS NOT NULL;