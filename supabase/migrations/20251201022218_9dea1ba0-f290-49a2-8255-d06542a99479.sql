-- Fix vaccination compliance percentage to never exceed 100%
-- First drop the existing function
DROP FUNCTION IF EXISTS calculate_vaccination_status(UUID, UUID);

-- Then recreate it with the fix
CREATE OR REPLACE FUNCTION calculate_vaccination_status(
  _animal_id UUID,
  _cabana_id UUID
)
RETURNS TABLE (
  vaccine_code TEXT,
  vaccine_name TEXT,
  is_mandatory BOOLEAN,
  doses_required INTEGER,
  doses_given INTEGER,
  last_dose_date DATE,
  next_due_date DATE,
  status TEXT,
  compliance_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH animal_info AS (
    SELECT a.sex, a.birth_date,
           EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER * 12 + 
           EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER as age_months
    FROM animals a
    WHERE a.id = _animal_id
  ),
  applicable_requirements AS (
    SELECT vr.*
    FROM cabaña_vaccination_requirements vr
    CROSS JOIN animal_info ai
    WHERE vr.cabaña_id = _cabana_id
      AND vr.is_active = true
      AND (vr.sex_restriction IS NULL OR vr.sex_restriction = ai.sex)
      AND (vr.min_age_months IS NULL OR ai.age_months >= vr.min_age_months)
      AND (vr.max_age_months IS NULL OR ai.age_months <= vr.max_age_months)
  ),
  vaccine_data AS (
    SELECT 
      ar.vaccine_code,
      ar.vaccine_name,
      ar.is_mandatory,
      ar.doses_required,
      ar.frequency_months,
      COUNT(av.id) as doses_given,
      MAX(av.date) as last_dose_date,
      CASE 
        WHEN ar.frequency_months IS NOT NULL AND MAX(av.date) IS NOT NULL 
        THEN (MAX(av.date) + (ar.frequency_months || ' months')::INTERVAL)::DATE
        ELSE NULL
      END as next_due_date
    FROM applicable_requirements ar
    LEFT JOIN animal_vaccines av ON av.animal_id = _animal_id 
      AND av.vaccine_code = ar.vaccine_code
      AND av.cabaña_id = _cabana_id
    GROUP BY ar.vaccine_code, ar.vaccine_name, ar.is_mandatory, ar.doses_required, ar.frequency_months
  )
  SELECT 
    vd.vaccine_code,
    vd.vaccine_name,
    vd.is_mandatory,
    vd.doses_required,
    vd.doses_given::INTEGER,
    vd.last_dose_date,
    vd.next_due_date,
    CASE 
      WHEN vd.doses_given >= vd.doses_required AND (vd.next_due_date IS NULL OR vd.next_due_date > CURRENT_DATE)
        THEN 'completa'
      WHEN vd.next_due_date IS NOT NULL AND vd.next_due_date < CURRENT_DATE
        THEN 'vencida'
      WHEN vd.doses_given > 0 AND vd.doses_given < vd.doses_required
        THEN 'pendiente'
      ELSE 'no_aplicada'
    END AS status,
    CASE WHEN vd.doses_required > 0 
      THEN LEAST(ROUND((vd.doses_given::NUMERIC / vd.doses_required::NUMERIC) * 100, 1), 100)
      ELSE 0 
    END AS compliance_percentage
  FROM vaccine_data vd;
END;
$$;