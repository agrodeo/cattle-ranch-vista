-- Fix function search path for security
CREATE OR REPLACE FUNCTION public.get_vaccination_alerts_for_animal(_animal_id UUID, _country TEXT DEFAULT 'Argentina')
RETURNS TABLE(
  scheme_id UUID,
  vaccine_name TEXT,
  vaccine_type TEXT,
  is_mandatory BOOLEAN,
  status TEXT, -- 'missing', 'overdue', 'due_soon', 'up_to_date'
  days_since_last INTEGER,
  days_until_due INTEGER,
  last_vaccination_date DATE,
  next_due_date DATE,
  description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;