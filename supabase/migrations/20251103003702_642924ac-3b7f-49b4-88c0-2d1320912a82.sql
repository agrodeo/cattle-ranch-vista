-- Complete Vaccination System Redesign Migration
-- This migration implements the complete vaccination system redesign

-- ============================================================================
-- PART 1: Create or update functions for vaccination status calculation
-- ============================================================================

-- Function to calculate vaccination status for a single animal
CREATE OR REPLACE FUNCTION calculate_vaccination_status(_animal_id uuid, _cabana_id uuid)
RETURNS TABLE (
  requirement_id uuid,
  vaccine_code text,
  vaccine_name text,
  is_mandatory boolean,
  status text, -- 'completa', 'pendiente', 'vencida', 'no_aplica'
  doses_given integer,
  doses_required integer,
  last_vaccination_date date,
  next_due_date date,
  days_overdue integer,
  compliance_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  animal_rec RECORD;
  req RECORD;
  last_vac RECORD;
  age_months numeric;
BEGIN
  -- Get animal info
  SELECT a.*, 
         EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) as age_in_months,
         CASE WHEN a.esta_preñada = true THEN true ELSE false END as is_pregnant
  INTO animal_rec
  FROM animals a
  WHERE a.id = _animal_id AND a.cabaña_id = _cabana_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  age_months := COALESCE(animal_rec.age_in_months, 0);

  -- Loop through all requirements for this cabaña
  FOR req IN 
    SELECT * 
    FROM cabaña_vaccination_requirements cvr
    WHERE cvr.cabaña_id = _cabana_id AND cvr.is_active = true
  LOOP
    -- Check if requirement applies to this animal
    -- Skip if sex doesn't match
    IF req.sex_restriction IS NOT NULL AND 
       req.sex_restriction != 'Ambos' AND 
       req.sex_restriction != animal_rec.sex THEN
      CONTINUE;
    END IF;

    -- Skip if animal is too young
    IF req.min_age_months IS NOT NULL AND age_months < req.min_age_months THEN
      CONTINUE;
    END IF;

    -- Skip if animal is too old
    IF req.max_age_months IS NOT NULL AND age_months > req.max_age_months THEN
      CONTINUE;
    END IF;

    -- Get last vaccination for this requirement
    SELECT 
      av.date,
      av.dose_number,
      av.next_due,
      COUNT(*) OVER () as total_doses
    INTO last_vac
    FROM animal_vaccines av
    WHERE av.animal_id = _animal_id 
      AND (av.requirement_id = req.id OR av.vaccine_code = req.vaccine_code)
    ORDER BY av.date DESC
    LIMIT 1;

    -- Determine status
    requirement_id := req.id;
    vaccine_code := req.vaccine_code;
    vaccine_name := req.vaccine_name;
    is_mandatory := req.is_mandatory;
    doses_required := COALESCE(req.doses_required, 1);
    doses_given := COALESCE(last_vac.total_doses, 0);
    last_vaccination_date := last_vac.date;
    next_due_date := last_vac.next_due;

    IF last_vac.date IS NULL THEN
      -- Never vaccinated
      status := 'pendiente';
      days_overdue := 0;
      compliance_percentage := 0;
    ELSIF last_vac.next_due IS NOT NULL AND last_vac.next_due < CURRENT_DATE THEN
      -- Overdue
      status := 'vencida';
      days_overdue := CURRENT_DATE - last_vac.next_due;
      compliance_percentage := LEAST(100, (doses_given::numeric / doses_required::numeric) * 100);
    ELSIF doses_given >= doses_required THEN
      -- Complete
      status := 'completa';
      days_overdue := 0;
      compliance_percentage := 100;
    ELSE
      -- Partial
      status := 'pendiente';
      days_overdue := 0;
      compliance_percentage := (doses_given::numeric / doses_required::numeric) * 100;
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============================================================================
-- PART 2: Create function to calculate corral vaccination metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_corral_vaccination_metrics(_corral_id uuid)
RETURNS TABLE (
  total_animals integer,
  total_requirements integer,
  total_vaccinations_given integer,
  total_vaccinations_needed integer,
  overall_compliance_percentage numeric,
  mandatory_compliance_percentage numeric,
  animals_fully_compliant integer,
  animals_partially_compliant integer,
  animals_non_compliant integer,
  animals_with_overdue integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  corral_rec RECORD;
  animal_rec RECORD;
  vac_status RECORD;
  animal_compliance numeric;
  animal_mandatory_compliance numeric;
  total_compliance numeric := 0;
  total_mandatory_compliance numeric := 0;
  animals_count integer := 0;
  fully_compliant integer := 0;
  partially_compliant integer := 0;
  non_compliant integer := 0;
  with_overdue integer := 0;
  total_given integer := 0;
  total_needed integer := 0;
  total_reqs integer := 0;
BEGIN
  -- Get corral info
  SELECT c.cabaña_id INTO corral_rec
  FROM corrales c
  WHERE c.id = _corral_id;

  IF NOT FOUND THEN
    total_animals := 0;
    total_requirements := 0;
    total_vaccinations_given := 0;
    total_vaccinations_needed := 0;
    overall_compliance_percentage := 0;
    mandatory_compliance_percentage := 0;
    animals_fully_compliant := 0;
    animals_partially_compliant := 0;
    animals_non_compliant := 0;
    animals_with_overdue := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Count total requirements for this cabaña
  SELECT COUNT(*) INTO total_reqs
  FROM cabaña_vaccination_requirements
  WHERE cabaña_id = corral_rec.cabaña_id AND is_active = true;

  -- Loop through animals in corral
  FOR animal_rec IN 
    SELECT a.id, a.cabaña_id
    FROM animals a
    WHERE a.corral_id = _corral_id 
      AND a.status NOT IN ('vendido', 'muerto', 'Vendido', 'Muerto')
  LOOP
    animals_count := animals_count + 1;
    animal_compliance := 0;
    animal_mandatory_compliance := 0;
    
    DECLARE
      req_count integer := 0;
      mandatory_count integer := 0;
      overdue_count integer := 0;
    BEGIN
      FOR vac_status IN 
        SELECT * FROM calculate_vaccination_status(animal_rec.id, animal_rec.cabaña_id)
      LOOP
        req_count := req_count + 1;
        total_given := total_given + vac_status.doses_given;
        total_needed := total_needed + vac_status.doses_required;
        
        animal_compliance := animal_compliance + vac_status.compliance_percentage;
        
        IF vac_status.is_mandatory THEN
          mandatory_count := mandatory_count + 1;
          animal_mandatory_compliance := animal_mandatory_compliance + vac_status.compliance_percentage;
        END IF;
        
        IF vac_status.status = 'vencida' THEN
          overdue_count := overdue_count + 1;
        END IF;
      END LOOP;

      -- Calculate animal compliance
      IF req_count > 0 THEN
        animal_compliance := animal_compliance / req_count;
        total_compliance := total_compliance + animal_compliance;
        
        IF animal_compliance >= 100 THEN
          fully_compliant := fully_compliant + 1;
        ELSIF animal_compliance > 0 THEN
          partially_compliant := partially_compliant + 1;
        ELSE
          non_compliant := non_compliant + 1;
        END IF;
      END IF;

      IF mandatory_count > 0 THEN
        animal_mandatory_compliance := animal_mandatory_compliance / mandatory_count;
        total_mandatory_compliance := total_mandatory_compliance + animal_mandatory_compliance;
      END IF;

      IF overdue_count > 0 THEN
        with_overdue := with_overdue + 1;
      END IF;
    END;
  END LOOP;

  -- Calculate averages
  total_animals := animals_count;
  total_requirements := total_reqs;
  total_vaccinations_given := total_given;
  total_vaccinations_needed := total_needed;
  
  IF animals_count > 0 THEN
    overall_compliance_percentage := ROUND(total_compliance / animals_count, 1);
    mandatory_compliance_percentage := ROUND(total_mandatory_compliance / animals_count, 1);
  ELSE
    overall_compliance_percentage := 0;
    mandatory_compliance_percentage := 0;
  END IF;
  
  animals_fully_compliant := fully_compliant;
  animals_partially_compliant := partially_compliant;
  animals_non_compliant := non_compliant;
  animals_with_overdue := with_overdue;

  RETURN NEXT;
END;
$$;

-- ============================================================================
-- PART 3: Create simplified function to record vaccinations
-- ============================================================================

CREATE OR REPLACE FUNCTION record_animal_vaccination(
  _animal_id uuid,
  _requirement_id uuid,
  _date date,
  _lot text DEFAULT NULL,
  _dose text DEFAULT NULL,
  _route text DEFAULT NULL,
  _created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  req RECORD;
  animal_rec RECORD;
  next_dose_number integer;
  calculated_next_due date;
  new_vaccination_id uuid;
  is_scheme_complete boolean;
BEGIN
  -- Get requirement
  SELECT * INTO req
  FROM cabaña_vaccination_requirements
  WHERE id = _requirement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requirement not found';
  END IF;

  -- Get animal and verify it belongs to same cabaña
  SELECT * INTO animal_rec
  FROM animals
  WHERE id = _animal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Animal not found';
  END IF;

  IF animal_rec.cabaña_id != req.cabaña_id THEN
    RAISE EXCEPTION 'Animal does not belong to requirement cabaña';
  END IF;

  -- Get next dose number
  SELECT COALESCE(MAX(dose_number), 0) + 1 INTO next_dose_number
  FROM animal_vaccines
  WHERE animal_id = _animal_id 
    AND (requirement_id = _requirement_id OR vaccine_code = req.vaccine_code);

  -- Calculate next due date if frequency is set
  IF req.frequency_months IS NOT NULL AND req.frequency_months > 0 THEN
    calculated_next_due := _date + (req.frequency_months || ' months')::interval;
  ELSIF req.interval_between_doses_days IS NOT NULL AND next_dose_number < COALESCE(req.doses_required, 1) THEN
    calculated_next_due := _date + (req.interval_between_doses_days || ' days')::interval;
  END IF;

  -- Check if scheme is complete
  is_scheme_complete := next_dose_number >= COALESCE(req.doses_required, 1);

  -- Insert vaccination record
  INSERT INTO animal_vaccines (
    animal_id,
    cabaña_id,
    requirement_id,
    vaccine_code,
    date,
    dose_number,
    lot,
    dose,
    route,
    next_due,
    is_complete,
    created_by,
    created_at
  ) VALUES (
    _animal_id,
    animal_rec.cabaña_id,
    _requirement_id,
    req.vaccine_code,
    _date,
    next_dose_number,
    _lot,
    _dose,
    _route,
    calculated_next_due,
    is_scheme_complete,
    COALESCE(_created_by, auth.uid()),
    NOW()
  ) RETURNING id INTO new_vaccination_id;

  RETURN new_vaccination_id;
END;
$$;

-- ============================================================================
-- PART 4: Data Migration - Link existing vaccinations to requirements
-- ============================================================================

-- Try to link existing animal_vaccines to requirements based on vaccine_code
UPDATE animal_vaccines av
SET requirement_id = (
  SELECT cvr.id 
  FROM cabaña_vaccination_requirements cvr
  WHERE cvr.cabaña_id = av.cabaña_id
  AND cvr.vaccine_code = av.vaccine_code
  AND cvr.is_active = true
  LIMIT 1
)
WHERE av.requirement_id IS NULL
  AND av.vaccine_code IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM cabaña_vaccination_requirements cvr
    WHERE cvr.cabaña_id = av.cabaña_id
    AND cvr.vaccine_code = av.vaccine_code
    AND cvr.is_active = true
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_vaccination_status TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_corral_vaccination_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION record_animal_vaccination TO authenticated;