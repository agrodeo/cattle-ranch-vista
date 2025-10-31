-- Drop and recreate rpc_corral_complete_kpis with fixed column reference
DROP FUNCTION IF EXISTS public.rpc_corral_complete_kpis(uuid);

CREATE FUNCTION public.rpc_corral_complete_kpis(_user_id uuid)
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
  last_weighing_date timestamp with time zone,
  vaccination_status text,
  pregnancy_rate numeric,
  avg_weight numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_cabana AS (
    SELECT p.cabaña_id
    FROM profiles p
    WHERE p.user_id = _user_id
    LIMIT 1
  ),
  corral_animals AS (
    SELECT 
      c.id as corral_id,
      c.name as corral_name,
      c.hectareas,
      a.id as animal_id,
      a.sex,
      a.birth_date,
      a.esta_preñada
    FROM corrales c
    CROSS JOIN user_cabana u
    LEFT JOIN animals a ON a.corral_id = c.id 
      AND a.status NOT IN ('vendido', 'muerto')
      AND a.cabaña_id = u.cabaña_id
    WHERE c.cabaña_id = u.cabaña_id
  ),
  consanguinity_data AS (
    SELECT 
      ca.corral_id,
      COUNT(DISTINCT cr.animal_1_id) as risk_count,
      MAX(cr.severity::text) as highest_severity
    FROM corral_animals ca
    LEFT JOIN consanguinity_risks cr ON cr.animal_1_id = ca.animal_id OR cr.animal_2_id = ca.animal_id
    GROUP BY ca.corral_id
  ),
  vaccination_data AS (
    SELECT 
      ca.corral_id,
      ca.animal_id,
      CASE 
        WHEN COUNT(DISTINCT req.id) = 0 THEN 100
        ELSE (
          COUNT(DISTINCT CASE 
            WHEN (
              SELECT COUNT(DISTINCT av.id) > 0
              FROM animal_vaccines av
              WHERE av.animal_id = ca.animal_id
                AND av.fecha >= CURRENT_DATE - (req.frequency_days || ' days')::interval
                AND LOWER(av.vaccine_code) LIKE '%' || LOWER(req.vaccine_name) || '%'
            ) THEN req.id 
          END)::numeric / NULLIF(COUNT(DISTINCT req.id), 0) * 100
        )
      END as animal_vaccination_percentage,
      COUNT(DISTINCT CASE 
        WHEN NOT (
          SELECT COUNT(DISTINCT av.id) > 0
          FROM animal_vaccines av
          WHERE av.animal_id = ca.animal_id
            AND av.fecha >= CURRENT_DATE - (req.frequency_days || ' days')::interval
            AND LOWER(av.vaccine_code) LIKE '%' || LOWER(req.vaccine_name) || '%'
        ) 
        AND (req.sex_restriction IS NULL OR req.sex_restriction = ca.sex)
        AND (req.min_age_months IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, ca.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, ca.birth_date)) >= req.min_age_months)
        AND (req.max_age_months IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, ca.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, ca.birth_date)) <= req.max_age_months)
        THEN req.id 
      END) as overdue_count
    FROM corral_animals ca
    CROSS JOIN user_cabana u
    LEFT JOIN cabaña_vaccination_requirements req ON req.cabaña_id = u.cabaña_id
      AND (req.sex_restriction IS NULL OR req.sex_restriction = ca.sex)
      AND (req.min_age_months IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, ca.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, ca.birth_date)) >= req.min_age_months)
      AND (req.max_age_months IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, ca.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, ca.birth_date)) <= req.max_age_months)
    GROUP BY ca.corral_id, ca.animal_id
  ),
  vaccination_summary AS (
    SELECT 
      vd.corral_id,
      COALESCE(AVG(vd.animal_vaccination_percentage), 0) as vaccination_percentage,
      SUM(vd.overdue_count) as vaccination_alerts
    FROM vaccination_data vd
    GROUP BY vd.corral_id
  ),
  weighing_data AS (
    SELECT 
      ca.corral_id,
      COUNT(DISTINCT p.id) as recent_weighings_count,
      MAX(p.fecha) as last_weighing_date,
      AVG(p.peso) as avg_weight,
      AVG(
        CASE 
          WHEN p.peso IS NOT NULL AND prev_p.peso IS NOT NULL 
            AND p.fecha > prev_p.fecha 
          THEN (p.peso - prev_p.peso) / NULLIF(EXTRACT(DAY FROM p.fecha - prev_p.fecha), 0)
          ELSE NULL
        END
      ) as avg_daily_gain
    FROM corral_animals ca
    LEFT JOIN pesajes p ON p.animal_id = ca.animal_id
      AND p.fecha >= CURRENT_DATE - INTERVAL '90 days'
    LEFT JOIN LATERAL (
      SELECT peso, fecha
      FROM pesajes
      WHERE animal_id = ca.animal_id
        AND fecha < p.fecha
      ORDER BY fecha DESC
      LIMIT 1
    ) prev_p ON true
    GROUP BY ca.corral_id
  )
  SELECT 
    ca.corral_id,
    ca.corral_name,
    COUNT(DISTINCT ca.animal_id) as animal_count,
    COUNT(DISTINCT CASE WHEN ca.sex = 'Macho' THEN ca.animal_id END) as male_count,
    COUNT(DISTINCT CASE WHEN ca.sex = 'Hembra' THEN ca.animal_id END) as female_count,
    ca.hectareas,
    COALESCE(cd.risk_count, 0) as consanguinity_risk_count,
    cd.highest_severity,
    ROUND(COALESCE(vs.vaccination_percentage, 0), 1) as vaccination_percentage,
    COALESCE(vs.vaccination_alerts, 0) as vaccination_alerts,
    ROUND(COALESCE(wd.avg_daily_gain, 0), 3) as avg_daily_gain,
    COALESCE(wd.recent_weighings_count, 0) as recent_weighings_count,
    wd.last_weighing_date,
    CASE 
      WHEN COALESCE(vs.vaccination_percentage, 0) >= 90 THEN 'excellent'
      WHEN COALESCE(vs.vaccination_percentage, 0) >= 70 THEN 'good'
      WHEN COALESCE(vs.vaccination_percentage, 0) >= 50 THEN 'warning'
      WHEN COALESCE(vs.vaccination_percentage, 0) > 0 THEN 'critical'
      ELSE 'unknown'
    END as vaccination_status,
    ROUND(
      COALESCE(
        COUNT(DISTINCT CASE WHEN ca.esta_preñada = true THEN ca.animal_id END)::numeric / 
        NULLIF(COUNT(DISTINCT CASE WHEN ca.sex = 'Hembra' THEN ca.animal_id END), 0) * 100,
        0
      ), 
      1
    ) as pregnancy_rate,
    ROUND(COALESCE(wd.avg_weight, 0), 1) as avg_weight
  FROM corral_animals ca
  LEFT JOIN consanguinity_data cd ON cd.corral_id = ca.corral_id
  LEFT JOIN vaccination_summary vs ON vs.corral_id = ca.corral_id
  LEFT JOIN weighing_data wd ON wd.corral_id = ca.corral_id
  GROUP BY ca.corral_id, ca.corral_name, ca.hectareas, cd.risk_count, cd.highest_severity, 
           vs.vaccination_percentage, vs.vaccination_alerts, wd.avg_daily_gain, 
           wd.recent_weighings_count, wd.last_weighing_date, wd.avg_weight
  ORDER BY ca.corral_name;
END;
$$;