-- Fix the RPC function to handle null vaccination records properly
CREATE OR REPLACE FUNCTION public.get_vaccination_alerts_for_animal(
  _animal_id uuid, 
  _country text DEFAULT 'Argentina'::text
)
RETURNS TABLE(
  scheme_id uuid, 
  vaccine_name text, 
  vaccine_type text, 
  is_mandatory boolean, 
  status text, 
  days_since_last integer, 
  days_until_due integer, 
  last_vaccination_date date, 
  next_due_date date, 
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  animal_record RECORD;
  scheme_record RECORD;
  last_vaccination_date DATE;
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
    ORDER BY vs.is_mandatory DESC, vs.name
  LOOP
    -- Initialize variables
    alert_status := 'missing';
    days_since := NULL;
    days_until := NULL;
    next_due := NULL;
    last_vaccination_date := NULL;
    
    -- Check if animal meets minimum age for this vaccine
    IF scheme_record.min_age_months IS NOT NULL AND age_months < scheme_record.min_age_months THEN
      alert_status := 'due_soon';
      days_until := (scheme_record.min_age_months - age_months) * 30; -- Approximate days
    ELSE
      -- Check for vaccination history
      SELECT vh.fecha
      INTO last_vaccination_date
      FROM public.vacunas_historial vh
      WHERE vh.animal_id = _animal_id
        AND (
          UPPER(vh.vacuna) LIKE '%' || UPPER(scheme_record.vaccine_type) || '%'
          OR UPPER(vh.vacuna) LIKE '%' || UPPER(scheme_record.name) || '%'
        )
      ORDER BY vh.fecha DESC
      LIMIT 1;
      
      IF last_vaccination_date IS NOT NULL THEN
        days_since := CURRENT_DATE - last_vaccination_date;
        alert_status := 'up_to_date';
        
        -- Check if booster is needed
        IF scheme_record.frequency_days IS NOT NULL THEN
          next_due := last_vaccination_date + scheme_record.frequency_days;
          days_until := next_due - CURRENT_DATE;
          
          IF days_until < 0 THEN
            alert_status := 'overdue';
          ELSIF days_until <= 30 THEN
            alert_status := 'due_soon';
          END IF;
        END IF;
      ELSE
        alert_status := 'missing';
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
      last_vaccination_date,
      next_due,
      scheme_record.description;
  END LOOP;
END;
$$;