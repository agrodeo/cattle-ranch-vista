-- ============================================
-- COMPLETE WEIGHING SYSTEM IMPLEMENTATION
-- ============================================

-- 1. Create animal_weight_history table for better performance
CREATE TABLE IF NOT EXISTS public.animal_weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  cabaña_id UUID NOT NULL,
  peso_kg NUMERIC NOT NULL CHECK (peso_kg > 0),
  fecha DATE NOT NULL,
  edad_dias INTEGER,
  peso_anterior NUMERIC,
  dias_desde_ultimo_pesaje INTEGER,
  ganancia_diaria NUMERIC,
  tipo_pesaje TEXT CHECK (tipo_pesaje IN ('nacimiento', 'destete', 'final', 'control')),
  evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_weight_history_animal ON public.animal_weight_history(animal_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_weight_history_cabana ON public.animal_weight_history(cabaña_id);
CREATE INDEX IF NOT EXISTS idx_weight_history_tipo ON public.animal_weight_history(tipo_pesaje);

-- Enable RLS
ALTER TABLE public.animal_weight_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view weight history for their cabaña"
  ON public.animal_weight_history FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can manage weight history for their cabaña"
  ON public.animal_weight_history FOR ALL
  USING (cabaña_id = get_current_user_cabana_id())
  WITH CHECK (cabaña_id = get_current_user_cabana_id());

-- ============================================
-- 2. Function to classify weighing type
-- ============================================
CREATE OR REPLACE FUNCTION public.classify_weighing_type(
  animal_birth_date DATE,
  weighing_date DATE,
  animal_status TEXT
) RETURNS TEXT AS $$
DECLARE
  edad_dias INTEGER;
BEGIN
  -- Calculate age in days
  IF animal_birth_date IS NULL THEN
    RETURN 'control';
  END IF;
  
  edad_dias := weighing_date - animal_birth_date;
  
  -- Birth weight: < 7 days old
  IF edad_dias < 7 THEN
    RETURN 'nacimiento';
  END IF;
  
  -- Weaning weight: 180-240 days old
  IF edad_dias >= 180 AND edad_dias <= 240 THEN
    RETURN 'destete';
  END IF;
  
  -- Final weight: > 540 days or sold
  IF edad_dias > 540 OR animal_status = 'vendido' THEN
    RETURN 'final';
  END IF;
  
  -- Otherwise, it's a control weighing
  RETURN 'control';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 3. Function to calculate daily gain
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_daily_gain(
  current_weight NUMERIC,
  previous_weight NUMERIC,
  days_between INTEGER
) RETURNS NUMERIC AS $$
BEGIN
  IF days_between <= 0 OR previous_weight IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND((current_weight - previous_weight) / days_between, 3);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 4. Trigger function to process weighings
-- ============================================
CREATE OR REPLACE FUNCTION public.process_weighing_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  medicion JSONB;
  animal_record RECORD;
  previous_weight RECORD;
  tipo_pesaje_calculado TEXT;
  edad_dias_calc INTEGER;
  ganancia_diaria_calc NUMERIC;
  dias_desde_ultimo INTEGER;
BEGIN
  -- Process each measurement in the mediciones array
  FOR medicion IN SELECT * FROM jsonb_array_elements(NEW.mediciones)
  LOOP
    -- Get animal information
    SELECT 
      a.id, 
      a.cabaña_id, 
      a.birth_date, 
      a.status,
      e.fecha as evento_fecha
    INTO animal_record
    FROM public.animals a
    JOIN public.eventos e ON e.id = NEW.evento_id
    WHERE a.id = (medicion->>'animal_id')::UUID;
    
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    -- Calculate age in days
    IF animal_record.birth_date IS NOT NULL THEN
      edad_dias_calc := animal_record.evento_fecha - animal_record.birth_date;
    ELSE
      edad_dias_calc := NULL;
    END IF;
    
    -- Get previous weighing for this animal
    SELECT peso_kg, fecha
    INTO previous_weight
    FROM public.animal_weight_history
    WHERE animal_id = animal_record.id
    ORDER BY fecha DESC, created_at DESC
    LIMIT 1;
    
    -- Calculate days since last weighing
    IF previous_weight.fecha IS NOT NULL THEN
      dias_desde_ultimo := animal_record.evento_fecha - previous_weight.fecha;
    ELSE
      dias_desde_ultimo := NULL;
    END IF;
    
    -- Calculate daily gain
    ganancia_diaria_calc := calculate_daily_gain(
      (medicion->>'peso_kg')::NUMERIC,
      previous_weight.peso_kg,
      dias_desde_ultimo
    );
    
    -- Classify weighing type
    tipo_pesaje_calculado := classify_weighing_type(
      animal_record.birth_date,
      animal_record.evento_fecha,
      animal_record.status
    );
    
    -- Insert into weight history
    INSERT INTO public.animal_weight_history (
      animal_id,
      cabaña_id,
      peso_kg,
      fecha,
      edad_dias,
      peso_anterior,
      dias_desde_ultimo_pesaje,
      ganancia_diaria,
      tipo_pesaje,
      evento_id
    ) VALUES (
      animal_record.id,
      animal_record.cabaña_id,
      (medicion->>'peso_kg')::NUMERIC,
      animal_record.evento_fecha,
      edad_dias_calc,
      previous_weight.peso_kg,
      dias_desde_ultimo,
      ganancia_diaria_calc,
      tipo_pesaje_calculado,
      NEW.evento_id
    );
    
    -- Update animals table
    UPDATE public.animals
    SET 
      peso_actual_kg = (medicion->>'peso_kg')::NUMERIC,
      fecha_ultimo_pesaje = animal_record.evento_fecha,
      ganancia_diaria_kg = ganancia_diaria_calc,
      -- Update special weight fields based on type
      peso_nacimiento = CASE 
        WHEN tipo_pesaje_calculado = 'nacimiento' THEN (medicion->>'peso_kg')::NUMERIC
        ELSE peso_nacimiento
      END,
      peso_destete = CASE 
        WHEN tipo_pesaje_calculado = 'destete' THEN (medicion->>'peso_kg')::NUMERIC
        ELSE peso_destete
      END,
      peso_final = CASE 
        WHEN tipo_pesaje_calculado = 'final' THEN (medicion->>'peso_kg')::NUMERIC
        ELSE peso_final
      END
    WHERE id = animal_record.id;
    
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_process_weighing ON public.pesajes;
CREATE TRIGGER trigger_process_weighing
  AFTER INSERT ON public.pesajes
  FOR EACH ROW
  EXECUTE FUNCTION public.process_weighing_after_insert();

-- ============================================
-- 5. Function to migrate historical data
-- ============================================
CREATE OR REPLACE FUNCTION public.migrate_historical_weighings()
RETURNS TEXT AS $$
DECLARE
  pesaje_record RECORD;
  total_processed INTEGER := 0;
BEGIN
  -- Process all existing weighings
  FOR pesaje_record IN 
    SELECT p.*, e.fecha, e.cabaña_id
    FROM public.pesajes p
    JOIN public.eventos e ON e.id = p.evento_id
    ORDER BY e.fecha
  LOOP
    -- Trigger will handle the processing
    -- Just need to update the mediciones to trigger the function
    UPDATE public.pesajes
    SET mediciones = pesaje_record.mediciones
    WHERE id = pesaje_record.id;
    
    total_processed := total_processed + 1;
  END LOOP;
  
  RETURN 'Processed ' || total_processed || ' weighing records';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. RPC Function: Get animal weight history
-- ============================================
CREATE OR REPLACE FUNCTION public.get_animal_weight_history(
  _animal_id UUID
) RETURNS TABLE (
  id UUID,
  fecha DATE,
  peso_kg NUMERIC,
  edad_dias INTEGER,
  ganancia_diaria NUMERIC,
  tipo_pesaje TEXT,
  peso_anterior NUMERIC,
  dias_desde_ultimo INTEGER,
  notas TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    awh.id,
    awh.fecha,
    awh.peso_kg,
    awh.edad_dias,
    awh.ganancia_diaria,
    awh.tipo_pesaje,
    awh.peso_anterior,
    awh.dias_desde_ultimo_pesaje,
    awh.notas
  FROM public.animal_weight_history awh
  WHERE awh.animal_id = _animal_id
  ORDER BY awh.fecha DESC, awh.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 7. RPC Function: Get herd weight summary
-- ============================================
CREATE OR REPLACE FUNCTION public.get_herd_weight_summary(
  _cabana_id UUID,
  _date_from DATE DEFAULT NULL,
  _date_to DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  total_weighings INTEGER,
  peso_promedio NUMERIC,
  ganancia_diaria_promedio NUMERIC,
  animales_pesados INTEGER,
  por_categoria JSONB,
  top_performers JSONB,
  low_performers JSONB
) AS $$
DECLARE
  date_from_actual DATE;
BEGIN
  date_from_actual := COALESCE(_date_from, CURRENT_DATE - INTERVAL '90 days');
  
  RETURN QUERY
  WITH recent_weights AS (
    SELECT DISTINCT ON (awh.animal_id)
      awh.animal_id,
      awh.peso_kg,
      awh.ganancia_diaria,
      a.sex,
      a.birth_date,
      a.id_tag,
      a.name,
      CASE 
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + 
             EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) < 12 THEN 'Ternero'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + 
             EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) < 24 THEN 'Novillo'
        ELSE 'Adulto'
      END as categoria
    FROM public.animal_weight_history awh
    JOIN public.animals a ON a.id = awh.animal_id
    WHERE awh.cabaña_id = _cabana_id
      AND awh.fecha BETWEEN date_from_actual AND _date_to
      AND a.status NOT IN ('vendido', 'muerto')
    ORDER BY awh.animal_id, awh.fecha DESC, awh.created_at DESC
  ),
  category_stats AS (
    SELECT 
      categoria,
      COUNT(*) as count,
      ROUND(AVG(peso_kg), 1) as peso_promedio,
      ROUND(AVG(ganancia_diaria), 3) as adg_promedio
    FROM recent_weights
    GROUP BY categoria
  ),
  top_10 AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id_tag', id_tag,
        'name', name,
        'ganancia_diaria', ganancia_diaria
      )
    ) as top_json
    FROM (
      SELECT id_tag, name, ganancia_diaria
      FROM recent_weights
      WHERE ganancia_diaria IS NOT NULL
      ORDER BY ganancia_diaria DESC
      LIMIT 10
    ) t
  ),
  low_10 AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id_tag', id_tag,
        'name', name,
        'ganancia_diaria', ganancia_diaria
      )
    ) as low_json
    FROM (
      SELECT id_tag, name, ganancia_diaria
      FROM recent_weights
      WHERE ganancia_diaria IS NOT NULL AND ganancia_diaria < 0.5
      ORDER BY ganancia_diaria ASC
      LIMIT 10
    ) l
  )
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.animal_weight_history 
     WHERE cabaña_id = _cabana_id 
     AND fecha BETWEEN date_from_actual AND _date_to),
    ROUND((SELECT AVG(peso_kg) FROM recent_weights), 1),
    ROUND((SELECT AVG(ganancia_diaria) FROM recent_weights WHERE ganancia_diaria IS NOT NULL), 3),
    (SELECT COUNT(DISTINCT animal_id)::INTEGER FROM recent_weights),
    (SELECT jsonb_object_agg(categoria, jsonb_build_object(
      'count', count,
      'peso_promedio', peso_promedio,
      'adg_promedio', adg_promedio
    )) FROM category_stats),
    (SELECT top_json FROM top_10),
    (SELECT low_json FROM low_10);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 8. Update trigger for updated_at
-- ============================================
CREATE TRIGGER update_weight_history_updated_at
  BEFORE UPDATE ON public.animal_weight_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();