-- Step 4: Compliance Engine Functions

-- Function to compile rules for a ranch (materialized rule set)
CREATE OR REPLACE FUNCTION public.compile_rules_for_ranch(_cabana_id UUID)
RETURNS TABLE(
  vaccine_code TEXT,
  vaccine_name TEXT,
  mandatory BOOLEAN,
  one_time BOOLEAN,
  booster_interval_days INTEGER,
  coverage_window_days INTEGER,
  sex TEXT,
  min_age_days INTEGER,
  max_age_days INTEGER,
  category TEXT,
  pregnancy_ok BOOLEAN,
  notes TEXT,
  campaign_windows JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings RECORD;
  rule_record RECORD;
  jurisdiction_list TEXT[];
BEGIN
  -- Get herd settings
  SELECT * INTO settings 
  FROM public.herd_settings 
  WHERE cabaña_id = _cabana_id;
  
  -- If no settings found, use default global rules
  IF NOT FOUND THEN
    jurisdiction_list := ARRAY['GLOBAL'];
  ELSE
    -- Build jurisdiction precedence: region > country > global
    jurisdiction_list := ARRAY['GLOBAL', settings.country];
    IF settings.region IS NOT NULL THEN
      jurisdiction_list := jurisdiction_list || settings.region;
    END IF;
  END IF;
  
  -- Return compiled rules with precedence (later jurisdictions override earlier ones)
  FOR rule_record IN
    WITH ranked_rules AS (
      SELECT DISTINCT ON (vr.vaccine_code) 
        vr.*,
        v.name as vaccine_name,
        CASE 
          WHEN vr.jurisdiction_code = ANY(jurisdiction_list[3:]) THEN 3 -- region
          WHEN vr.jurisdiction_code = jurisdiction_list[2] THEN 2 -- country  
          ELSE 1 -- global
        END as precedence
      FROM public.vaccine_rules vr
      JOIN public.vaccines v ON v.code = vr.vaccine_code
      WHERE vr.jurisdiction_code = ANY(jurisdiction_list)
        AND vr.active = true
      ORDER BY vr.vaccine_code, precedence DESC
    ),
    campaigns AS (
      SELECT 
        vc.vaccine_code,
        jsonb_agg(
          jsonb_build_object(
            'window_start', vc.window_start,
            'window_end', vc.window_end,
            'label', vc.label
          ) ORDER BY vc.window_start
        ) as windows
      FROM public.vaccine_campaigns vc
      WHERE vc.jurisdiction_code = ANY(jurisdiction_list)
        AND (vc.window_end >= CURRENT_DATE OR vc.window_start >= CURRENT_DATE - INTERVAL '1 year')
      GROUP BY vc.vaccine_code
    )
    SELECT 
      rr.vaccine_code,
      rr.vaccine_name,
      rr.mandatory,
      rr.one_time,
      rr.booster_interval_days,
      rr.coverage_window_days,
      rr.sex,
      rr.min_age_days,
      rr.max_age_days,
      rr.category,
      rr.pregnancy_ok,
      rr.notes,
      COALESCE(c.windows, '[]'::jsonb) as campaign_windows
    FROM ranked_rules rr
    LEFT JOIN campaigns c ON c.vaccine_code = rr.vaccine_code
  LOOP
    vaccine_code := rule_record.vaccine_code;
    vaccine_name := rule_record.vaccine_name;
    mandatory := rule_record.mandatory;
    one_time := rule_record.one_time;
    booster_interval_days := rule_record.booster_interval_days;
    coverage_window_days := rule_record.coverage_window_days;
    sex := rule_record.sex;
    min_age_days := rule_record.min_age_days;
    max_age_days := rule_record.max_age_days;
    category := rule_record.category;
    pregnancy_ok := rule_record.pregnancy_ok;
    notes := rule_record.notes;
    campaign_windows := rule_record.campaign_windows;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Function to compute due vaccines for a single animal
CREATE OR REPLACE FUNCTION public.compute_due_vaccines_for_animal(_animal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  animal_record RECORD;
  rule_record RECORD;
  last_vaccination_record RECORD;
  due_vaccines JSONB := '[]'::jsonb;
  vaccine_due JSONB;
  age_days INTEGER;
  animal_category TEXT;
  last_dose_date DATE;
  days_since_last INTEGER;
  next_due_date DATE;
  is_due BOOLEAN := false;
  rationale TEXT;
  campaign_active BOOLEAN := false;
  current_campaign JSONB;
  campaign_window JSONB;
BEGIN
  -- Get animal details
  SELECT a.*, EXTRACT(DAY FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER as age_in_days
  INTO animal_record
  FROM public.animals a
  WHERE a.id = _animal_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Animal not found"}'::jsonb;
  END IF;
  
  -- Skip if animal is inactive
  IF animal_record.status IN ('muerto', 'vendido') THEN
    RETURN '{"due_vaccines": [], "coverage_badges": [], "animal_status": "inactive"}'::jsonb;
  END IF;
  
  age_days := animal_record.age_in_days;
  
  -- Determine animal category based on age and sex
  animal_category := CASE 
    WHEN age_days < 365 THEN 'ternero'
    WHEN animal_record.sex = 'F' AND age_days < 730 THEN 'vaquillona'
    WHEN animal_record.sex = 'F' THEN 'vaca'
    WHEN animal_record.sex = 'M' THEN 'toro'
    ELSE 'cualquiera'
  END;
  
  -- Process each applicable rule
  FOR rule_record IN 
    SELECT * FROM public.compile_rules_for_ranch(animal_record.cabaña_id)
  LOOP
    -- Check if rule applies to this animal
    IF (rule_record.sex != 'ANY' AND rule_record.sex != 
        CASE animal_record.sex WHEN 'Hembra' THEN 'F' WHEN 'Macho' THEN 'M' ELSE 'ANY' END) THEN
      CONTINUE;
    END IF;
    
    IF (rule_record.category != 'cualquiera' AND rule_record.category != animal_category) THEN
      CONTINUE;
    END IF;
    
    IF (age_days < rule_record.min_age_days) THEN
      CONTINUE;
    END IF;
    
    IF (rule_record.max_age_days IS NOT NULL AND age_days > rule_record.max_age_days) THEN
      CONTINUE;
    END IF;
    
    IF (NOT rule_record.pregnancy_ok AND animal_record.esta_preñada) THEN
      CONTINUE;
    END IF;
    
    -- Get last vaccination for this vaccine
    SELECT date INTO last_dose_date
    FROM public.animal_vaccines
    WHERE animal_id = _animal_id 
      AND vaccine_code = rule_record.vaccine_code
    ORDER BY date DESC
    LIMIT 1;
    
    is_due := false;
    rationale := '';
    next_due_date := NULL;
    
    -- Check if currently in campaign window
    campaign_active := false;
    current_campaign := NULL;
    
    FOR campaign_window IN SELECT * FROM jsonb_array_elements(rule_record.campaign_windows)
    LOOP
      IF CURRENT_DATE BETWEEN (campaign_window->>'window_start')::DATE 
                         AND (campaign_window->>'window_end')::DATE THEN
        campaign_active := true;
        current_campaign := campaign_window;
        EXIT;
      END IF;
    END LOOP;
    
    -- Determine if due based on rule type
    IF rule_record.one_time THEN
      -- One-time vaccine (like Brucelosis)
      IF last_dose_date IS NULL THEN
        is_due := true;
        rationale := 'Vacuna única nunca aplicada';
      ELSE
        rationale := 'Vacuna única ya aplicada';
      END IF;
    ELSE
      -- Recurring vaccine
      IF last_dose_date IS NULL THEN
        is_due := true;
        rationale := 'Primera dosis requerida';
        IF rule_record.booster_interval_days IS NOT NULL THEN
          next_due_date := CURRENT_DATE + rule_record.booster_interval_days;
        END IF;
      ELSIF rule_record.booster_interval_days IS NOT NULL THEN
        days_since_last := CURRENT_DATE - last_dose_date;
        next_due_date := last_dose_date + rule_record.booster_interval_days;
        
        IF days_since_last >= rule_record.booster_interval_days THEN
          is_due := true;
          rationale := format('Vencida hace %s días', days_since_last - rule_record.booster_interval_days);
        ELSIF campaign_active AND last_dose_date < (current_campaign->>'window_start')::DATE THEN
          is_due := true;
          rationale := format('Campaña activa: %s', current_campaign->>'label');
        ELSE
          rationale := format('Al día - próxima dosis: %s', next_due_date);
        END IF;
      END IF;
    END IF;
    
    -- Build vaccine due object if due or for informational purposes
    vaccine_due := jsonb_build_object(
      'vaccine_code', rule_record.vaccine_code,
      'vaccine_name', rule_record.vaccine_name,
      'mandatory', rule_record.mandatory,
      'one_time', rule_record.one_time,
      'is_due', is_due,
      'rationale', rationale,
      'last_dose_date', last_dose_date,
      'next_due_date', next_due_date,
      'days_since_last', CASE WHEN last_dose_date IS NOT NULL THEN CURRENT_DATE - last_dose_date ELSE NULL END,
      'campaign_active', campaign_active,
      'current_campaign', current_campaign
    );
    
    due_vaccines := due_vaccines || vaccine_due;
  END LOOP;
  
  RETURN jsonb_build_object(
    'due_vaccines', due_vaccines,
    'animal_category', animal_category,
    'age_days', age_days,
    'animal_status', animal_record.status
  );
END;
$$;

-- Function to record vaccination and update compliance
CREATE OR REPLACE FUNCTION public.record_vaccination(
  _animal_id UUID,
  _vaccine_code TEXT,
  _date DATE,
  _lot TEXT DEFAULT NULL,
  _dose TEXT DEFAULT NULL,
  _route TEXT DEFAULT NULL,
  _created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  animal_record RECORD;
  rule_record RECORD;
  vaccination_id UUID;
  next_due DATE;
  user_cabana_id UUID;
BEGIN
  -- Get user's cabaña_id for security
  SELECT cabaña_id INTO user_cabana_id FROM public.users WHERE id = COALESCE(_created_by, auth.uid());
  
  -- Get animal and verify ownership
  SELECT * INTO animal_record FROM public.animals WHERE id = _animal_id;
  
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Animal not found"}'::jsonb;
  END IF;
  
  IF animal_record.cabaña_id != user_cabana_id THEN
    RETURN '{"success": false, "error": "Animal does not belong to your cabaña"}'::jsonb;
  END IF;
  
  -- Validate date
  IF _date > CURRENT_DATE THEN
    RETURN '{"success": false, "error": "Fecha inválida (futura)"}'::jsonb;
  END IF;
  
  -- Check if animal is active
  IF animal_record.status IN ('muerto', 'vendido') THEN
    RETURN '{"success": false, "error": "Animal no activo"}'::jsonb;
  END IF;
  
  -- Verify vaccine exists
  IF NOT EXISTS(SELECT 1 FROM public.vaccines WHERE code = _vaccine_code) THEN
    RETURN '{"success": false, "error": "Vacuna desconocida (configure alias o seleccione del catálogo)"}'::jsonb;
  END IF;
  
  -- Calculate next due date based on rules
  SELECT * INTO rule_record 
  FROM public.compile_rules_for_ranch(animal_record.cabaña_id)
  WHERE vaccine_code = _vaccine_code;
  
  IF FOUND AND NOT rule_record.one_time AND rule_record.booster_interval_days IS NOT NULL THEN
    next_due := _date + rule_record.booster_interval_days;
  END IF;
  
  -- Insert vaccination record
  INSERT INTO public.animal_vaccines (
    animal_id, cabaña_id, vaccine_code, date, lot, dose, route, next_due, created_by
  ) VALUES (
    _animal_id, user_cabana_id, _vaccine_code, _date, _lot, _dose, _route, next_due, COALESCE(_created_by, auth.uid())
  ) RETURNING id INTO vaccination_id;
  
  -- Return success with vaccination details
  RETURN jsonb_build_object(
    'success', true,
    'vaccination_id', vaccination_id,
    'next_due', next_due,
    'message', 'Vacunación registrada correctamente'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;