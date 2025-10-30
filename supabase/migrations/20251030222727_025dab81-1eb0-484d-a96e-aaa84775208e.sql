-- Fix rpc_corral_complete_kpis to check profiles table first
DROP FUNCTION IF EXISTS public.rpc_corral_complete_kpis(uuid);

CREATE OR REPLACE FUNCTION public.rpc_corral_complete_kpis(_user_id uuid)
RETURNS TABLE(
  corral_id uuid,
  corral_name text,
  animal_count bigint,
  male_count bigint,
  female_count bigint,
  hectareas numeric,
  consanguinity_risk_count bigint,
  highest_severity text,
  vaccination_percentage numeric,
  vaccination_alerts bigint,
  avg_daily_gain numeric,
  recent_weighings_count bigint,
  last_weighing_date date,
  vaccination_status text,
  pregnancy_rate numeric,
  avg_weight numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
BEGIN
  -- Get user's cabaña - CHECK PROFILES FIRST (correct table)
  SELECT cabaña_id INTO cabana_uuid FROM public.profiles WHERE user_id = _user_id;
  IF cabana_uuid IS NULL THEN
    SELECT cabaña_id INTO cabana_uuid FROM public.users WHERE id = _user_id;
  END IF;
  
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;

  RETURN QUERY
  WITH active_animals AS (
    SELECT 
      a.id,
      a.corral_id,
      a.sex,
      a.birth_date,
      CASE 
        WHEN a.birth_date IS NOT NULL THEN
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date))::integer * 12 + 
          EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::integer
        ELSE NULL
      END as age_months,
      a.peso_actual_kg,
      a.esta_preñada
    FROM animals a
    WHERE a.cabaña_id = cabana_uuid
      AND LOWER(COALESCE(a.status, 'activo')) NOT IN ('vendido', 'muerto')
  ),
  animal_vaccination_compliance AS (
    SELECT 
      aa.id as animal_id,
      aa.corral_id,
      -- Count applicable mandatory requirements for this animal
      (
        SELECT COUNT(DISTINCT req.id)
        FROM cabaña_vaccination_requirements req
        WHERE req.cabaña_id = cabana_uuid
          AND req.is_active = true
          AND req.is_mandatory = true
          AND (req.sex_restriction IS NULL OR req.sex_restriction = aa.sex)
          AND (req.min_age_months IS NULL OR COALESCE(aa.age_months, 0) >= req.min_age_months)
          AND (req.max_age_months IS NULL OR COALESCE(aa.age_months, 999) <= req.max_age_months)
      ) as applicable_requirements,
      -- Count covered requirements (with up-to-date vaccinations)
      (
        SELECT COUNT(DISTINCT av.vaccine_code)
        FROM animal_vaccines av
        WHERE av.animal_id = aa.id
          AND av.cabaña_id = cabana_uuid
          AND EXISTS (
            SELECT 1 
            FROM cabaña_vaccination_requirements req
            WHERE req.cabaña_id = cabana_uuid
              AND req.is_active = true
              AND req.is_mandatory = true
              AND req.vaccine_name = av.vaccine_code
              AND (req.sex_restriction IS NULL OR req.sex_restriction = aa.sex)
              AND (req.min_age_months IS NULL OR COALESCE(aa.age_months, 0) >= req.min_age_months)
              AND (req.max_age_months IS NULL OR COALESCE(aa.age_months, 999) <= req.max_age_months)
          )
          AND (av.next_due IS NULL OR av.next_due >= CURRENT_DATE)
      ) as covered_requirements,
      -- Count overdue vaccinations for alerts
      (
        SELECT COUNT(DISTINCT av.vaccine_code)
        FROM animal_vaccines av
        WHERE av.animal_id = aa.id
          AND av.cabaña_id = cabana_uuid
          AND av.next_due IS NOT NULL
          AND av.next_due < CURRENT_DATE
          AND EXISTS (
            SELECT 1 
            FROM cabaña_vaccination_requirements req
            WHERE req.cabaña_id = cabana_uuid
              AND req.is_active = true
              AND req.is_mandatory = true
              AND req.vaccine_name = av.vaccine_code
              AND (req.sex_restriction IS NULL OR req.sex_restriction = aa.sex)
          )
      ) as overdue_count
    FROM active_animals aa
  ),
  corral_stats AS (
    SELECT 
      aa.corral_id,
      COUNT(*)::bigint as total_animals,
      COUNT(*) FILTER (WHERE aa.sex = 'Macho')::bigint as males,
      COUNT(*) FILTER (WHERE aa.sex = 'Hembra')::bigint as females,
      COUNT(*) FILTER (WHERE aa.esta_preñada = true)::bigint as pregnant_count,
      ROUND(AVG(aa.peso_actual_kg), 2) as average_weight
    FROM active_animals aa
    GROUP BY aa.corral_id
  ),
  vaccination_stats AS (
    SELECT 
      avc.corral_id,
      -- Average vaccination percentage across all animals in corral
      CASE 
        WHEN COUNT(*) > 0 THEN
          ROUND(
            AVG(
              CASE 
                WHEN avc.applicable_requirements > 0 THEN 
                  (avc.covered_requirements::numeric / avc.applicable_requirements::numeric) * 100
                ELSE 0
              END
            ), 
            1
          )
        ELSE 0
      END as avg_vaccination_percentage,
      SUM(avc.overdue_count)::bigint as total_alerts
    FROM animal_vaccination_compliance avc
    GROUP BY avc.corral_id
  ),
  weight_stats AS (
    SELECT 
      aa.corral_id,
      ROUND(AVG(aa.peso_actual_kg), 2) as avg_daily_gain_placeholder,
      COUNT(*) FILTER (WHERE aa.peso_actual_kg IS NOT NULL)::bigint as weighings_count,
      MAX(CURRENT_DATE) as last_weighing
    FROM active_animals aa
    GROUP BY aa.corral_id
  ),
  consanguinity_data AS (
    SELECT 
      a.corral_id,
      COUNT(DISTINCT a.id) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM animals a2
          WHERE a2.cabaña_id = cabana_uuid
            AND a2.corral_id = a.corral_id
            AND a2.id != a.id
            AND (
              (a.father_id IS NOT NULL AND a.father_id = a2.father_id) OR
              (a.mother_id IS NOT NULL AND a.mother_id = a2.mother_id)
            )
        )
      )::bigint as risk_count
    FROM animals a
    WHERE a.cabaña_id = cabana_uuid
      AND LOWER(COALESCE(a.status, 'activo')) NOT IN ('vendido', 'muerto')
    GROUP BY a.corral_id
  )
  SELECT 
    c.id as corral_id,
    c.name as corral_name,
    COALESCE(cs.total_animals, 0) as animal_count,
    COALESCE(cs.males, 0) as male_count,
    COALESCE(cs.females, 0) as female_count,
    c.hectareas,
    COALESCE(cd.risk_count, 0) as consanguinity_risk_count,
    NULL::text as highest_severity,
    COALESCE(vs.avg_vaccination_percentage, 0) as vaccination_percentage,
    COALESCE(vs.total_alerts, 0) as vaccination_alerts,
    COALESCE(ws.avg_daily_gain_placeholder, 0) as avg_daily_gain,
    COALESCE(ws.weighings_count, 0) as recent_weighings_count,
    ws.last_weighing as last_weighing_date,
    CASE 
      WHEN COALESCE(vs.avg_vaccination_percentage, 0) >= 90 THEN 'excellent'
      WHEN COALESCE(vs.avg_vaccination_percentage, 0) >= 70 THEN 'good'
      WHEN COALESCE(vs.avg_vaccination_percentage, 0) >= 50 THEN 'warning'
      WHEN COALESCE(vs.avg_vaccination_percentage, 0) > 0 THEN 'critical'
      ELSE 'unknown'
    END::text as vaccination_status,
    CASE 
      WHEN COALESCE(cs.females, 0) > 0 THEN
        ROUND((cs.pregnant_count::numeric / cs.females::numeric) * 100, 1)
      ELSE 0
    END as pregnancy_rate,
    COALESCE(cs.average_weight, 0) as avg_weight
  FROM corrales c
  LEFT JOIN corral_stats cs ON c.id = cs.corral_id
  LEFT JOIN vaccination_stats vs ON c.id = vs.corral_id
  LEFT JOIN weight_stats ws ON c.id = ws.corral_id
  LEFT JOIN consanguinity_data cd ON c.id = cd.corral_id
  WHERE c.cabaña_id = cabana_uuid
  ORDER BY c.name;
END;
$function$;