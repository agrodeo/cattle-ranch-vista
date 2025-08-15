-- Fix function search path security warnings for trigger functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix function search path for crear_preñeces_ia
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix function search path for actualizar_pesos
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix function search path for crear_historial_vacunas
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';