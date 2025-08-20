-- Fix remaining database functions missing search_path

CREATE OR REPLACE FUNCTION public.get_service_pregnancy_stats(_service_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stats JSONB;
  total_count INTEGER;
  pendientes_count INTEGER;
  preñadas_count INTEGER;
  vacias_count INTEGER;
  porcentaje_preñez NUMERIC;
BEGIN
  -- Contar estados
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE estado = 'pendiente'),
    COUNT(*) FILTER (WHERE estado = 'preñada'),
    COUNT(*) FILTER (WHERE estado = 'vacía')
  INTO total_count, pendientes_count, preñadas_count, vacias_count
  FROM public.ia_service_animals
  WHERE service_id = _service_id;

  -- Calcular porcentaje (excluir pendientes del denominador)
  IF (preñadas_count + vacias_count) > 0 THEN
    porcentaje_preñez := ROUND((preñadas_count::NUMERIC / (preñadas_count + vacias_count)::NUMERIC) * 100, 1);
  ELSE
    porcentaje_preñez := NULL;
  END IF;

  stats := jsonb_build_object(
    'total', total_count,
    'pendientes', pendientes_count,
    'preñadas', preñadas_count,
    'vacias', vacias_count,
    'porcentaje_preñez', porcentaje_preñez
  );

  RETURN stats;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_finance_movement(_user_id uuid, _movement_id uuid, _date date, _type text, _amount numeric, _description text DEFAULT NULL::text, _category_id uuid DEFAULT NULL::uuid, _buyer_name text DEFAULT NULL::text, _buyer_document text DEFAULT NULL::text, _buyer_destination text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cab_id uuid;
  allowed boolean;
BEGIN
  -- Validate inputs
  IF _type IS NULL OR (_type != 'ingreso' AND _type != 'egreso') THEN
    RAISE EXCEPTION 'Invalid type. Must be ingreso or egreso';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  -- Check permissions
  allowed := public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'employee');
  IF NOT allowed THEN
    RAISE EXCEPTION 'Not authorized to update finance movements';
  END IF;

  -- Update the movement (only if it belongs to the user's cabaña)
  UPDATE public.finances 
  SET 
    date = _date,
    type = _type,
    amount = _amount,
    description = _description,
    category_id = _category_id,
    buyer_name = _buyer_name,
    buyer_document = _buyer_document,
    buyer_destination = _buyer_destination
  WHERE id = _movement_id 
    AND cabaña_id = cab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Finance movement not found or not authorized';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_finance_movement(_user_id uuid, _movement_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cab_id uuid;
  allowed boolean;
BEGIN
  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  -- Check permissions
  allowed := public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'employee');
  IF NOT allowed THEN
    RAISE EXCEPTION 'Not authorized to delete finance movements';
  END IF;

  -- Delete the movement (only if it belongs to the user's cabaña)
  DELETE FROM public.finances 
  WHERE id = _movement_id 
    AND cabaña_id = cab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Finance movement not found or not authorized';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_vaccination_alerts_for_animal(_animal_id uuid, _country text DEFAULT 'Argentina'::text)
 RETURNS TABLE(scheme_id uuid, vaccine_name text, vaccine_type text, is_mandatory boolean, status text, days_since_last integer, days_until_due integer, last_vaccination_date date, next_due_date date, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  animal_record RECORD;
  scheme_record RECORD;
  last_vaccination_record RECORD;
  age_months INTEGER;
  days_since INTEGER;
  days_until INTEGER;
  next_due DATE;
  alert_status TEXT;
BEGIN
  -- Get animal details
  SELECT a.*, EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER as age_in_months
  INTO animal_record
  FROM public.animals a
  WHERE a.id = _animal_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  age_months := animal_record.age_in_months;
  
  -- Loop through applicable vaccination schemes
  FOR scheme_record IN
    SELECT vs.*
    FROM public.vaccination_schemes vs
    WHERE vs.country = _country
      AND vs.is_active = true
      AND (vs.sex_restriction IS NULL OR vs.sex_restriction = animal_record.sex)
      AND (vs.min_age_months IS NULL OR age_months >= vs.min_age_months)
      AND (vs.max_age_months IS NULL OR age_months <= vs.max_age_months)
    ORDER BY vs.is_mandatory DESC, vs.name
  LOOP
    -- Get last vaccination for this vaccine type
    SELECT vh.fecha
    INTO last_vaccination_record
    FROM public.vacunas_historial vh
    WHERE vh.animal_id = _animal_id
      AND UPPER(vh.vacuna) LIKE '%' || UPPER(scheme_record.vaccine_type) || '%'
    ORDER BY vh.fecha DESC
    LIMIT 1;
    
    -- Calculate status
    IF last_vaccination_record IS NULL THEN
      alert_status := 'missing';
      days_since := NULL;
      days_until := NULL;
      next_due := NULL;
    ELSE
      days_since := CURRENT_DATE - last_vaccination_record.fecha;
      
      IF scheme_record.frequency_days IS NULL THEN
        -- One-time vaccination
        alert_status := 'up_to_date';
        days_until := NULL;
        next_due := NULL;
      ELSE
        next_due := last_vaccination_record.fecha + scheme_record.frequency_days;
        days_until := next_due - CURRENT_DATE;
        
        IF days_until < 0 THEN
          alert_status := 'overdue';
        ELSIF days_until <= 30 THEN
          alert_status := 'due_soon';
        ELSE
          alert_status := 'up_to_date';
        END IF;
      END IF;
    END IF;
    
    -- Return the alert
    RETURN QUERY SELECT
      scheme_record.id,
      scheme_record.name,
      scheme_record.vaccine_type,
      scheme_record.is_mandatory,
      alert_status,
      days_since,
      days_until,
      last_vaccination_record.fecha,
      next_due,
      scheme_record.description;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_mortality_reports(_user_id uuid, _date_from date DEFAULT NULL::date, _date_to date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, animal_id uuid, fecha_defuncion date, edad_dias integer, edad_meses integer, causa_nombre text, causa_texto text, notas text, animal_name text, animal_id_tag text, animal_sex text, animal_breed text, cabana_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_cabana_id uuid;
BEGIN
  -- Get user's cabaña_id with fully qualified column reference
  SELECT u."cabaña_id" INTO user_cabana_id FROM public.users u WHERE u.id = _user_id;
  IF user_cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.animal_id,
    d.fecha_defuncion,
    d.edad_dias,
    d.edad_meses,
    cc.nombre as causa_nombre,
    d.causa_texto,
    d.notas,
    a.name as animal_name,
    a.id_tag as animal_id_tag,
    a.sex as animal_sex,
    a.breed as animal_breed,
    d."cabaña_id" as cabana_id
  FROM public.defunciones d
  LEFT JOIN public.animals a ON d.animal_id = a.id
  LEFT JOIN public.catalogo_causas cc ON d.causa_id = cc.id
  WHERE d."cabaña_id" = user_cabana_id
    AND (_date_from IS NULL OR d.fecha_defuncion >= _date_from)
    AND (_date_to IS NULL OR d.fecha_defuncion <= _date_to)
  ORDER BY d.fecha_defuncion DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_finance_summary(_user_id uuid, _from_date date DEFAULT NULL::date, _to_date date DEFAULT NULL::date)
 RETURNS TABLE(ingresos numeric, egresos numeric, balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cab_id uuid;
  total_ingresos numeric := 0;
  total_egresos numeric := 0;
  recurring_ingresos numeric := 0;
  recurring_egresos numeric := 0;
  range_start_date date;
  range_end_date date;
  months_in_range integer;
BEGIN
  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  -- Set default date range if not provided
  range_start_date := COALESCE(_from_date, '1900-01-01'::date);
  range_end_date := COALESCE(_to_date, CURRENT_DATE);
  
  -- Calculate months in range for recurring calculations
  months_in_range := EXTRACT(MONTH FROM AGE(range_end_date, range_start_date))::integer + 1;

  -- Calculate actual ingresos (income)
  SELECT COALESCE(SUM(f.amount), 0) INTO total_ingresos
  FROM public.finances f
  WHERE f.cabaña_id = cab_id
    AND f.type = 'ingreso'
    AND f.date >= range_start_date
    AND f.date <= range_end_date;

  -- Calculate actual egresos (expenses)
  SELECT COALESCE(SUM(f.amount), 0) INTO total_egresos
  FROM public.finances f
  WHERE f.cabaña_id = cab_id
    AND f.type = 'egreso'
    AND f.date >= range_start_date
    AND f.date <= range_end_date;

  -- Calculate recurring ingresos (income) for the date range
  SELECT COALESCE(SUM(
    CASE 
      WHEN fr.frequency = 'monthly' THEN fr.amount * months_in_range
      WHEN fr.frequency = 'yearly' THEN fr.amount * (months_in_range / 12.0)
      WHEN fr.frequency = 'weekly' THEN fr.amount * (months_in_range * 4.33)
      WHEN fr.frequency = 'daily' THEN fr.amount * (range_end_date - range_start_date + 1)
      ELSE 0
    END
  ), 0) INTO recurring_ingresos
  FROM public.finance_recurring fr
  WHERE fr.cabaña_id = cab_id
    AND fr.type = 'ingreso'
    AND fr.is_active = true
    AND (fr.start_date <= range_end_date)
    AND (fr.end_date IS NULL OR fr.end_date >= range_start_date);

  -- Calculate recurring egresos (expenses) for the date range
  SELECT COALESCE(SUM(
    CASE 
      WHEN fr.frequency = 'monthly' THEN fr.amount * months_in_range
      WHEN fr.frequency = 'yearly' THEN fr.amount * (months_in_range / 12.0)
      WHEN fr.frequency = 'weekly' THEN fr.amount * (months_in_range * 4.33)
      WHEN fr.frequency = 'daily' THEN fr.amount * (range_end_date - range_start_date + 1)
      ELSE 0
    END
  ), 0) INTO recurring_egresos
  FROM public.finance_recurring fr
  WHERE fr.cabaña_id = cab_id
    AND fr.type = 'egreso'
    AND fr.is_active = true
    AND (fr.start_date <= range_end_date)
    AND (fr.end_date IS NULL OR fr.end_date >= range_start_date);

  -- Return combined totals
  RETURN QUERY SELECT 
    (total_ingresos + recurring_ingresos),
    (total_egresos + recurring_egresos),
    ((total_ingresos + recurring_ingresos) - (total_egresos + recurring_egresos)) as balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_pesos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.crear_historial_vacunas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public."actualizar_estado_preñez"()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public."crear_preñeces_ia"()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.list_finance_reports(_user_id uuid)
 RETURNS TABLE(date date, amount numeric, type text, category_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cab_id uuid;
BEGIN
  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  -- Return actual finance data and projected recurring data
  RETURN QUERY
  -- Actual finance records
  SELECT 
    f.date,
    f.amount,
    f.type,
    fc.name as category_name
  FROM public.finances f
  LEFT JOIN public.finance_categories fc ON f.category_id = fc.id
  WHERE f.cabaña_id = cab_id
  
  UNION ALL
  
  -- Recurring finance records projected for past 6 months + current + next 6 months (13 months total)
  SELECT 
    generate_series.month::date as date,
    CASE 
      WHEN fr.frequency = 'monthly' THEN fr.amount
      WHEN fr.frequency = 'yearly' THEN fr.amount / 12.0
      WHEN fr.frequency = 'weekly' THEN fr.amount * 4.33
      WHEN fr.frequency = 'daily' THEN fr.amount * 30.44
      ELSE 0
    END as amount,
    fr.type,
    CONCAT(fc.name, ' (Recurrente)') as category_name
  FROM public.finance_recurring fr
  LEFT JOIN public.finance_categories fc ON fr.category_id = fc.id
  CROSS JOIN (
    SELECT date_trunc('month', CURRENT_DATE - interval '6 months' + interval '1 month' * generate_series(0, 12))::date as month
  ) as generate_series
  WHERE fr.cabaña_id = cab_id
    AND fr.is_active = true
    AND (fr.start_date <= generate_series.month OR fr.start_date IS NULL)
    AND (fr.end_date >= generate_series.month OR fr.end_date IS NULL)
  
  ORDER BY date DESC;
END;
$function$;