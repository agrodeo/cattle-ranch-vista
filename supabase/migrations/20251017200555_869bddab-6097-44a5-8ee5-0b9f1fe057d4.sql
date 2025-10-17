-- Mejorar la función get_vaccination_compliance para hacer matching más flexible
DROP FUNCTION IF EXISTS public.get_vaccination_compliance(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_vaccination_compliance(
  _animal_id uuid,
  _cabana_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  vaccine_data jsonb;
BEGIN
  -- Get vaccination compliance for an animal
  WITH user_requirements AS (
    SELECT 
      vr.id::text as requirement_id,
      vr.vaccine_name,
      vr.vaccine_type,
      vr.is_mandatory,
      vr.doses_required,
      vr.frequency_months,
      vr.min_age_months,
      vr.max_age_months
    FROM cabaña_vaccination_requirements vr
    WHERE vr.cabaña_id = _cabana_id 
    AND vr.is_active = true
  ),
  animal_info AS (
    SELECT 
      birth_date,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) * 12 + 
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date)) as age_months
    FROM animals 
    WHERE id = _animal_id
  ),
  -- Unify vaccination history from both tables with improved matching
  unified_vaccinations AS (
    -- From animal_vaccines
    SELECT 
      av.vaccine_code,
      v.name as vaccine_name,
      av.date,
      av.dose_number,
      av.requirement_id::text
    FROM animal_vaccines av
    LEFT JOIN vaccines v ON av.vaccine_code = v.code
    WHERE av.animal_id = _animal_id
    AND av.cabaña_id = _cabana_id
    
    UNION ALL
    
    -- From vacunas_historial
    SELECT 
      vh.vacuna as vaccine_code,
      vh.vacuna as vaccine_name,
      vh.fecha as date,
      vh.dose_number,
      NULL as requirement_id
    FROM vacunas_historial vh
    WHERE vh.animal_id = _animal_id
    AND vh.cabaña_id = _cabana_id
  ),
  -- Match vaccinations to requirements using flexible matching
  matched_vaccinations AS (
    SELECT 
      ur.requirement_id,
      ur.vaccine_name,
      ur.vaccine_type,
      ur.is_mandatory,
      ur.doses_required,
      ur.frequency_months,
      COUNT(uv.vaccine_name) as doses_given,
      MAX(uv.date) as last_vaccination_date,
      CASE 
        WHEN ur.frequency_months IS NOT NULL AND MAX(uv.date) IS NOT NULL 
        THEN (MAX(uv.date) + (ur.frequency_months || ' months')::interval)::date
        ELSE NULL
      END as next_due_date
    FROM user_requirements ur
    CROSS JOIN animal_info ai
    LEFT JOIN unified_vaccinations uv ON (
      -- Flexible matching: check if requirement name is contained in vaccine name (case-insensitive)
      LOWER(uv.vaccine_name) LIKE '%' || LOWER(ur.vaccine_name) || '%'
      OR LOWER(ur.vaccine_name) LIKE '%' || LOWER(uv.vaccine_name) || '%'
    )
    WHERE (ur.min_age_months IS NULL OR ai.age_months >= ur.min_age_months)
    AND (ur.max_age_months IS NULL OR ai.age_months <= ur.max_age_months)
    GROUP BY 
      ur.requirement_id, 
      ur.vaccine_name, 
      ur.vaccine_type, 
      ur.is_mandatory, 
      ur.doses_required,
      ur.frequency_months
  ),
  vaccine_statuses AS (
    SELECT 
      mv.*,
      CASE 
        WHEN mv.doses_given >= mv.doses_required THEN 'complete'
        WHEN mv.doses_given > 0 AND mv.doses_given < mv.doses_required THEN 'incomplete'
        WHEN mv.next_due_date IS NOT NULL AND mv.next_due_date < CURRENT_DATE THEN 'overdue'
        WHEN mv.next_due_date IS NOT NULL AND mv.next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        WHEN mv.doses_given = 0 THEN 'not_started'
        ELSE 'up_to_date'
      END as status,
      CASE 
        WHEN mv.next_due_date IS NOT NULL AND mv.next_due_date < CURRENT_DATE 
        THEN (CURRENT_DATE - mv.next_due_date)::integer
        ELSE NULL
      END as days_overdue,
      CASE 
        WHEN mv.next_due_date IS NOT NULL AND mv.next_due_date < CURRENT_DATE 
        THEN true
        ELSE false
      END as is_overdue
    FROM matched_vaccinations mv
  )
  SELECT jsonb_build_object(
    'animal_id', _animal_id,
    'vaccines', COALESCE(jsonb_agg(
      jsonb_build_object(
        'requirement_id', vs.requirement_id,
        'vaccine_name', vs.vaccine_name,
        'vaccine_type', vs.vaccine_type,
        'is_mandatory', vs.is_mandatory,
        'doses_required', vs.doses_required,
        'doses_given', vs.doses_given,
        'last_vaccination_date', vs.last_vaccination_date,
        'next_due_date', vs.next_due_date,
        'status', vs.status,
        'days_overdue', vs.days_overdue,
        'is_overdue', vs.is_overdue
      )
      ORDER BY 
        CASE vs.status
          WHEN 'overdue' THEN 1
          WHEN 'not_started' THEN 2
          WHEN 'incomplete' THEN 3
          WHEN 'due_soon' THEN 4
          WHEN 'complete' THEN 5
          ELSE 6
        END,
        vs.vaccine_name
    ), '[]'::jsonb)
  ) INTO result
  FROM vaccine_statuses vs;
  
  RETURN result;
END;
$$;