-- Create comprehensive KPI calculation function
CREATE OR REPLACE FUNCTION public.calculate_individual_kpis(
  _animal_id uuid,
  _year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _animal RECORD;
  _servicios_totales integer := 0;
  _preñeces_detectadas integer := 0;
  _preñeces_exitosas integer := 0;
  _porcentaje_preñez numeric := 0;
  _porcentaje_paricion numeric := 0;
  _dias_abiertos integer := NULL;
  _ultimo_parto date;
  _ultimo_servicio date;
  _result jsonb;
BEGIN
  -- Get animal info
  SELECT a.*, EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::integer as age_months
  INTO _animal
  FROM animals a
  WHERE a.id = _animal_id;
  
  IF _animal IS NULL THEN
    RETURN jsonb_build_object('error', 'Animal not found');
  END IF;
  
  -- Only calculate for reproductive females
  IF _animal.sex != 'Hembra' OR _animal.age_months < 15 THEN
    RETURN jsonb_build_object(
      'animal_id', _animal_id,
      'is_reproductive', false,
      'reason', 'Not a reproductive female'
    );
  END IF;
  
  -- Count services (from reproductive_states)
  SELECT COUNT(*)
  INTO _servicios_totales
  FROM reproductive_states rs
  WHERE rs.animal_id = _animal_id
    AND (rs.fecha_servicio IS NOT NULL OR rs.fecha_ia IS NOT NULL)
    AND EXTRACT(YEAR FROM COALESCE(rs.fecha_servicio, rs.fecha_ia)) = _year;
  
  -- Count pregnancies detected
  SELECT COUNT(*)
  INTO _preñeces_detectadas
  FROM preñeces p
  WHERE p.animal_id = _animal_id
    AND EXTRACT(YEAR FROM p.fecha_deteccion) = _year;
  
  -- Count successful pregnancies
  SELECT COUNT(*)
  INTO _preñeces_exitosas
  FROM preñeces p
  WHERE p.animal_id = _animal_id
    AND p.estado_final IN ('exitosa', 'exitosa_servicio', 'exitosa_ia')
    AND EXTRACT(YEAR FROM COALESCE(p.fecha_parto_real, p.fecha_finalizacion)) = _year;
  
  -- Get last calving date
  SELECT MAX(p.fecha_parto_real)
  INTO _ultimo_parto
  FROM preñeces p
  WHERE p.animal_id = _animal_id
    AND p.estado_final IN ('exitosa', 'exitosa_servicio', 'exitosa_ia');
  
  -- Get last service date
  SELECT MAX(COALESCE(rs.fecha_servicio, rs.fecha_ia))
  INTO _ultimo_servicio
  FROM reproductive_states rs
  WHERE rs.animal_id = _animal_id;
  
  -- Calculate percentages
  IF _servicios_totales > 0 THEN
    _porcentaje_preñez := ROUND((_preñeces_detectadas::numeric / _servicios_totales::numeric) * 100, 1);
  END IF;
  
  IF _preñeces_detectadas > 0 THEN
    _porcentaje_paricion := ROUND((_preñeces_exitosas::numeric / _preñeces_detectadas::numeric) * 100, 1);
  END IF;
  
  -- Calculate days open (between last calving and next service)
  IF _ultimo_parto IS NOT NULL AND _ultimo_servicio IS NOT NULL AND _ultimo_servicio > _ultimo_parto THEN
    _dias_abiertos := _ultimo_servicio - _ultimo_parto;
  END IF;
  
  -- Build result
  _result := jsonb_build_object(
    'animal_id', _animal_id,
    'year', _year,
    'is_reproductive', true,
    'servicios_totales', _servicios_totales,
    'preñeces_detectadas', _preñeces_detectadas,
    'preñeces_exitosas', _preñeces_exitosas,
    'porcentaje_preñez', _porcentaje_preñez,
    'porcentaje_paricion', _porcentaje_paricion,
    'dias_abiertos', _dias_abiertos,
    'ultimo_parto', _ultimo_parto,
    'ultimo_servicio', _ultimo_servicio
  );
  
  -- Cache result
  INSERT INTO reproductive_kpis (
    animal_id, cabaña_id, year, servicios_totales, preñeces_detectadas,
    preñeces_exitosas, porcentaje_preñez, porcentaje_paricion,
    dias_abiertos, ultimo_parto, ultimo_servicio
  ) VALUES (
    _animal_id, _animal.cabaña_id, _year, _servicios_totales, _preñeces_detectadas,
    _preñeces_exitosas, _porcentaje_preñez, _porcentaje_paricion,
    _dias_abiertos, _ultimo_parto, _ultimo_servicio
  )
  ON CONFLICT (animal_id, year) 
  DO UPDATE SET
    servicios_totales = EXCLUDED.servicios_totales,
    preñeces_detectadas = EXCLUDED.preñeces_detectadas,
    preñeces_exitosas = EXCLUDED.preñeces_exitosas,
    porcentaje_preñez = EXCLUDED.porcentaje_preñez,
    porcentaje_paricion = EXCLUDED.porcentaje_paricion,
    dias_abiertos = EXCLUDED.dias_abiertos,
    ultimo_parto = EXCLUDED.ultimo_parto,
    ultimo_servicio = EXCLUDED.ultimo_servicio,
    updated_at = now();
  
  RETURN _result;
END;
$$;

-- Function to migrate existing offspring data to pregnancy records
CREATE OR REPLACE FUNCTION public.migrate_existing_reproductive_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mother_record RECORD;
  offspring_count integer;
  i integer;
BEGIN
  -- Migrate animals with existing offspring
  FOR mother_record IN
    SELECT DISTINCT m.id as mother_id, m.cabaña_id, COUNT(o.id) as offspring_count
    FROM animals m
    JOIN animals o ON m.id = o.mother_id
    WHERE m.sex = 'Hembra' 
      AND m.status NOT IN ('vendido', 'muerto')
      AND o.status NOT IN ('vendido', 'muerto')
    GROUP BY m.id, m.cabaña_id
  LOOP
    offspring_count := mother_record.offspring_count;
    
    -- Create retroactive successful pregnancy records
    FOR i IN 1..offspring_count LOOP
      INSERT INTO preñeces (
        animal_id, cabaña_id, tipo_origen, estado_final,
        fecha_inicio, fecha_deteccion, fecha_estimada_parto,
        fecha_finalizacion, motivo_finalizacion, notas
      ) VALUES (
        mother_record.mother_id,
        mother_record.cabaña_id,
        'migrada',
        'exitosa',
        CURRENT_DATE - INTERVAL '365 days' * i, -- Estimate dates
        CURRENT_DATE - INTERVAL '365 days' * i + INTERVAL '60 days',
        CURRENT_DATE - INTERVAL '365 days' * i + INTERVAL '283 days',
        CURRENT_DATE - INTERVAL '365 days' * i + INTERVAL '283 days',
        'parto_exitoso',
        'Migrada automáticamente desde datos existentes'
      );
    END LOOP;
    
    -- Update reproductive state
    INSERT INTO reproductive_states (
      animal_id, cabaña_id, estado_reproductivo
    ) VALUES (
      mother_record.mother_id,
      mother_record.cabaña_id,
      'post_parto'
    )
    ON CONFLICT (animal_id) DO UPDATE SET
      estado_reproductivo = 'post_parto',
      updated_at = now();
      
  END LOOP;
  
  RAISE NOTICE 'Migration completed for % mothers', 
    (SELECT COUNT(DISTINCT mother_id) FROM animals WHERE mother_id IS NOT NULL);
END;
$$;

-- Function for corral-level KPI calculation
CREATE OR REPLACE FUNCTION public.calculate_corral_kpis(
  _corral_id uuid,
  _year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _corral RECORD;
  _total_females integer := 0;
  _avg_preñez numeric := 0;
  _avg_paricion numeric := 0;
  _total_servicios integer := 0;
  _total_preñeces integer := 0;
  _total_exitosas integer := 0;
  _result jsonb;
BEGIN
  -- Get corral info
  SELECT * INTO _corral FROM corrales WHERE id = _corral_id;
  
  IF _corral IS NULL THEN
    RETURN jsonb_build_object('error', 'Corral not found');
  END IF;
  
  -- Count reproductive females in corral
  SELECT COUNT(*)
  INTO _total_females
  FROM animals a
  WHERE a.corral_id = _corral_id
    AND a.sex = 'Hembra'
    AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 15
    AND a.status NOT IN ('vendido', 'muerto');
  
  -- Aggregate individual KPIs
  SELECT 
    COALESCE(AVG(rk.porcentaje_preñez), 0),
    COALESCE(AVG(rk.porcentaje_paricion), 0),
    COALESCE(SUM(rk.servicios_totales), 0),
    COALESCE(SUM(rk.preñeces_detectadas), 0),
    COALESCE(SUM(rk.preñeces_exitosas), 0)
  INTO _avg_preñez, _avg_paricion, _total_servicios, _total_preñeces, _total_exitosas
  FROM reproductive_kpis rk
  JOIN animals a ON rk.animal_id = a.id
  WHERE a.corral_id = _corral_id
    AND rk.year = _year;
  
  _result := jsonb_build_object(
    'corral_id', _corral_id,
    'corral_name', _corral.name,
    'year', _year,
    'total_reproductive_females', _total_females,
    'avg_porcentaje_preñez', ROUND(_avg_preñez, 1),
    'avg_porcentaje_paricion', ROUND(_avg_paricion, 1),
    'total_servicios', _total_servicios,
    'total_preñeces', _total_preñeces,
    'total_exitosas', _total_exitosas
  );
  
  RETURN _result;
END;
$$;