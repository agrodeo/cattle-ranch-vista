-- Fix vaccination coverage calculation with fuzzy matching
CREATE OR REPLACE FUNCTION public.rpc_corral_complete_kpis(_user_id uuid)
RETURNS TABLE (
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
AS $$
DECLARE
  _cabana_id uuid;
BEGIN
  -- Get cabaña_id prioritizing profiles table
  SELECT COALESCE(p.cabaña_id, u.cabaña_id)
  INTO _cabana_id
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE u.id = _user_id;

  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'User % does not have a cabaña_id', _user_id;
  END IF;

  RETURN QUERY
  WITH corral_animals AS (
    SELECT 
      c.id AS corral_id,
      c.name AS corral_name,
      c.hectareas,
      a.id AS animal_id,
      a.sex,
      a.birth_date,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + 
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) AS age_months
    FROM corrales c
    LEFT JOIN animals a ON a.corral_id = c.id 
      AND a.status = 'activo'
      AND a.cabaña_id = _cabana_id
    WHERE c.cabaña_id = _cabana_id
  ),
  consanguinity_data AS (
    SELECT 
      corral_id,
      COUNT(*) FILTER (WHERE cr.severity IS NOT NULL) AS risk_count,
      MAX(cr.severity) AS max_severity
    FROM corral_animals ca
    LEFT JOIN consanguinity_risks cr ON cr.animal_id = ca.animal_id
    GROUP BY corral_id
  ),
  vaccination_data AS (
    SELECT 
      ca.corral_id,
      ca.animal_id,
      -- Count applicable requirements for this animal
      (
        SELECT COUNT(*)
        FROM cabaña_vaccination_requirements req
        WHERE req.cabaña_id = _cabana_id
          AND req.is_active = true
          AND (req.applies_to_sex = 'both' OR req.applies_to_sex = ca.sex)
          AND (req.min_age_months IS NULL OR ca.age_months >= req.min_age_months)
          AND (req.max_age_months IS NULL OR ca.age_months <= req.max_age_months)
      ) AS applicable_requirements,
      -- Count covered requirements (with fuzzy matching)
      (
        SELECT COUNT(DISTINCT req.id)
        FROM cabaña_vaccination_requirements req
        WHERE req.cabaña_id = _cabana_id
          AND req.is_active = true
          AND (req.applies_to_sex = 'both' OR req.applies_to_sex = ca.sex)
          AND (req.min_age_months IS NULL OR ca.age_months >= req.min_age_months)
          AND (req.max_age_months IS NULL OR ca.age_months <= req.max_age_months)
          AND EXISTS (
            SELECT 1
            FROM animal_vaccines av
            WHERE av.animal_id = ca.animal_id
              AND av.cabaña_id = _cabana_id
              AND LOWER(av.vaccine_code) LIKE '%' || LOWER(req.vaccine_name) || '%'
              AND (av.next_due IS NULL OR av.next_due >= CURRENT_DATE)
          )
      ) AS covered_requirements,
      -- Count overdue requirements (with fuzzy matching)
      (
        SELECT COUNT(DISTINCT req.id)
        FROM cabaña_vaccination_requirements req
        WHERE req.cabaña_id = _cabana_id
          AND req.is_active = true
          AND (req.applies_to_sex = 'both' OR req.applies_to_sex = ca.sex)
          AND (req.min_age_months IS NULL OR ca.age_months >= req.min_age_months)
          AND (req.max_age_months IS NULL OR ca.age_months <= req.max_age_months)
          AND NOT EXISTS (
            SELECT 1
            FROM animal_vaccines av
            WHERE av.animal_id = ca.animal_id
              AND av.cabaña_id = _cabana_id
              AND LOWER(av.vaccine_code) LIKE '%' || LOWER(req.vaccine_name) || '%'
              AND (av.next_due IS NULL OR av.next_due >= CURRENT_DATE)
          )
      ) AS overdue_count
    FROM corral_animals ca
    WHERE ca.animal_id IS NOT NULL
  ),
  weighing_data AS (
    SELECT 
      ca.corral_id,
      AVG(p.ganancia_diaria_kg) AS avg_gain,
      COUNT(p.id) AS weighing_count,
      MAX(p.fecha) AS last_date
    FROM corral_animals ca
    LEFT JOIN pesajes p ON p.animal_id = ca.animal_id
      AND p.fecha >= CURRENT_DATE - INTERVAL '90 days'
    WHERE ca.animal_id IS NOT NULL
    GROUP BY ca.corral_id
  ),
  pregnancy_data AS (
    SELECT
      ca.corral_id,
      COUNT(*) FILTER (WHERE ca.sex = 'hembra') AS female_count,
      COUNT(*) FILTER (WHERE rcs.estado_actual = 'preñada') AS pregnant_count
    FROM corral_animals ca
    LEFT JOIN reproductive_current_state rcs ON rcs.animal_id = ca.animal_id
    WHERE ca.animal_id IS NOT NULL
    GROUP BY ca.corral_id
  ),
  weight_data AS (
    SELECT
      ca.corral_id,
      AVG(a.peso_actual_kg) AS avg_weight
    FROM corral_animals ca
    LEFT JOIN animals a ON a.id = ca.animal_id
    WHERE ca.animal_id IS NOT NULL AND a.peso_actual_kg IS NOT NULL
    GROUP BY ca.corral_id
  )
  SELECT 
    ca.corral_id,
    ca.corral_name,
    COUNT(ca.animal_id) AS animal_count,
    COUNT(ca.animal_id) FILTER (WHERE ca.sex = 'macho') AS male_count,
    COUNT(ca.animal_id) FILTER (WHERE ca.sex = 'hembra') AS female_count,
    ca.hectareas,
    COALESCE(cd.risk_count, 0) AS consanguinity_risk_count,
    cd.max_severity AS highest_severity,
    ROUND(
      CASE 
        WHEN COUNT(ca.animal_id) = 0 THEN 0
        ELSE AVG(
          CASE 
            WHEN vd.applicable_requirements = 0 THEN 100
            ELSE (vd.covered_requirements::numeric / vd.applicable_requirements::numeric) * 100
          END
        )
      END, 
      2
    ) AS vaccination_percentage,
    COALESCE(SUM(vd.overdue_count), 0) AS vaccination_alerts,
    ROUND(COALESCE(wd.avg_gain, 0), 3) AS avg_daily_gain,
    COALESCE(wd.weighing_count, 0) AS recent_weighings_count,
    wd.last_date AS last_weighing_date,
    CASE
      WHEN COUNT(ca.animal_id) = 0 THEN 'unknown'
      WHEN AVG(
        CASE 
          WHEN vd.applicable_requirements = 0 THEN 100
          ELSE (vd.covered_requirements::numeric / vd.applicable_requirements::numeric) * 100
        END
      ) >= 90 THEN 'excellent'
      WHEN AVG(
        CASE 
          WHEN vd.applicable_requirements = 0 THEN 100
          ELSE (vd.covered_requirements::numeric / vd.applicable_requirements::numeric) * 100
        END
      ) >= 70 THEN 'good'
      WHEN AVG(
        CASE 
          WHEN vd.applicable_requirements = 0 THEN 100
          ELSE (vd.covered_requirements::numeric / vd.applicable_requirements::numeric) * 100
        END
      ) >= 50 THEN 'warning'
      ELSE 'critical'
    END AS vaccination_status,
    ROUND(
      CASE 
        WHEN COALESCE(pd.female_count, 0) = 0 THEN 0
        ELSE (COALESCE(pd.pregnant_count, 0)::numeric / pd.female_count::numeric) * 100
      END,
      2
    ) AS pregnancy_rate,
    ROUND(COALESCE(wtd.avg_weight, 0), 2) AS avg_weight
  FROM corral_animals ca
  LEFT JOIN consanguinity_data cd ON cd.corral_id = ca.corral_id
  LEFT JOIN vaccination_data vd ON vd.corral_id = ca.corral_id AND vd.animal_id = ca.animal_id
  LEFT JOIN weighing_data wd ON wd.corral_id = ca.corral_id
  LEFT JOIN pregnancy_data pd ON pd.corral_id = ca.corral_id
  LEFT JOIN weight_data wtd ON wtd.corral_id = ca.corral_id
  GROUP BY 
    ca.corral_id, 
    ca.corral_name, 
    ca.hectareas, 
    cd.risk_count, 
    cd.max_severity,
    wd.avg_gain,
    wd.weighing_count,
    wd.last_date,
    pd.female_count,
    pd.pregnant_count,
    wtd.avg_weight
  ORDER BY ca.corral_name;
END;
$$;