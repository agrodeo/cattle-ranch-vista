-- Vaccination System Redesign - Drop and Recreate Functions
DROP FUNCTION IF EXISTS calculate_vaccination_status(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS record_animal_vaccination(UUID, UUID, DATE, TEXT, TEXT, TEXT) CASCADE;

-- Create calculate_vaccination_status function
CREATE FUNCTION calculate_vaccination_status(_animal_id UUID, _cabana_id UUID)
RETURNS TABLE (
  requirement_id UUID, vaccine_code TEXT, vaccine_name TEXT, vaccine_type TEXT,
  is_mandatory BOOLEAN, status TEXT, doses_given INTEGER, doses_required INTEGER,
  last_vaccination_date DATE, next_due_date DATE, days_overdue INTEGER, compliance_percentage NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE animal_record RECORD; animal_age_months INTEGER;
BEGIN
  SELECT a.sex, a.birth_date, 
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) AS age_months
  INTO animal_record FROM animals a WHERE a.id = _animal_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Animal not found'; END IF;
  animal_age_months := COALESCE(animal_record.age_months, 0);
  
  RETURN QUERY
  WITH applicable_requirements AS (
    SELECT vr.* FROM cabaña_vaccination_requirements vr
    WHERE vr.cabaña_id = _cabana_id AND vr.is_active = true
      AND (vr.sex_restriction IS NULL OR vr.sex_restriction = animal_record.sex)
      AND (vr.min_age_months IS NULL OR animal_age_months >= vr.min_age_months)
      AND (vr.max_age_months IS NULL OR animal_age_months <= vr.max_age_months)
  ),
  vaccination_data AS (
    SELECT ar.id, ar.vaccine_code, ar.vaccine_name, ar.vaccine_type, ar.is_mandatory, ar.doses_required,
      COALESCE(COUNT(av.id), 0)::INTEGER AS doses_given,
      MAX(av.date)::DATE AS last_vaccination_date, MAX(av.next_due)::DATE AS next_due_date
    FROM applicable_requirements ar
    LEFT JOIN animal_vaccines av ON av.requirement_id = ar.id AND av.animal_id = _animal_id
    GROUP BY ar.id, ar.vaccine_code, ar.vaccine_name, ar.vaccine_type, ar.is_mandatory, ar.doses_required
  )
  SELECT vd.id, vd.vaccine_code, vd.vaccine_name, vd.vaccine_type, vd.is_mandatory,
    CASE
      WHEN vd.doses_given >= vd.doses_required AND (vd.next_due_date IS NULL OR vd.next_due_date >= CURRENT_DATE) THEN 'completa'
      WHEN vd.next_due_date IS NOT NULL AND vd.next_due_date < CURRENT_DATE THEN 'vencida'
      WHEN vd.doses_given > 0 AND vd.doses_given < vd.doses_required THEN 'pendiente'
      ELSE 'no_aplicada'
    END AS status,
    vd.doses_given, vd.doses_required, vd.last_vaccination_date, vd.next_due_date,
    CASE WHEN vd.next_due_date IS NOT NULL AND vd.next_due_date < CURRENT_DATE 
      THEN (CURRENT_DATE - vd.next_due_date)::INTEGER ELSE NULL END AS days_overdue,
    CASE WHEN vd.doses_required > 0 
      THEN ROUND((vd.doses_given::NUMERIC / vd.doses_required::NUMERIC) * 100, 1) ELSE 0 END AS compliance_percentage
  FROM vaccination_data vd
  ORDER BY vd.is_mandatory DESC, vd.vaccine_name;
END; $$;

-- Create record_animal_vaccination function
CREATE FUNCTION record_animal_vaccination(
  _animal_id UUID, _requirement_id UUID, _date DATE, _lot TEXT DEFAULT NULL, _dose TEXT DEFAULT NULL, _route TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _cabana_id UUID; _requirement RECORD; _previous_doses INTEGER; _dose_number INTEGER; _next_due DATE; _is_complete BOOLEAN; _vaccination_id UUID;
BEGIN
  SELECT cabaña_id INTO _cabana_id FROM animals WHERE id = _animal_id;
  IF _cabana_id IS NULL THEN RAISE EXCEPTION 'Animal not found'; END IF;
  
  SELECT * INTO _requirement FROM cabaña_vaccination_requirements WHERE id = _requirement_id AND cabaña_id = _cabana_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vaccination requirement not found'; END IF;
  
  SELECT COUNT(*) INTO _previous_doses FROM animal_vaccines WHERE animal_id = _animal_id AND requirement_id = _requirement_id;
  _dose_number := _previous_doses + 1;
  
  IF _requirement.frequency_months IS NOT NULL THEN
    _next_due := _date + (_requirement.frequency_months || ' months')::INTERVAL;
  ELSIF _dose_number < _requirement.doses_required AND _requirement.interval_between_doses_days IS NOT NULL THEN
    _next_due := _date + (_requirement.interval_between_doses_days || ' days')::INTERVAL;
  ELSE _next_due := NULL; END IF;
  
  _is_complete := (_dose_number >= _requirement.doses_required);
  
  INSERT INTO animal_vaccines (animal_id, cabaña_id, requirement_id, vaccine_code, date, dose_number, lot, dose, route, next_due, is_complete, created_by)
  VALUES (_animal_id, _cabana_id, _requirement_id, _requirement.vaccine_code, _date, _dose_number, _lot, _dose, _route, _next_due, _is_complete, auth.uid())
  RETURNING id INTO _vaccination_id;
  
  RETURN _vaccination_id;
END; $$;

GRANT EXECUTE ON FUNCTION calculate_vaccination_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_animal_vaccination(UUID, UUID, DATE, TEXT, TEXT, TEXT) TO authenticated;