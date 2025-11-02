-- ============================================================================
-- MIGRATION: Fix rpc_corral_complete_kpis for new vaccination system
-- ============================================================================

DROP FUNCTION IF EXISTS rpc_corral_complete_kpis(uuid);

CREATE OR REPLACE FUNCTION rpc_corral_complete_kpis(_user_id uuid)
RETURNS TABLE (
  corral_id uuid,
  corral_name text,
  animal_count bigint,
  avg_weight numeric,
  avg_daily_gain numeric,
  health_percentage numeric,
  vaccination_percentage numeric,
  reproductive_percentage numeric,
  financial_balance numeric,
  health_alerts bigint,
  vaccination_alerts bigint,
  reproductive_alerts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
      a.corral_id,
      a.id as animal_id,
      a.sex,
      a.birth_date,
      a.peso_actual_kg,
      a.ganancia_diaria_kg,
      a.esta_preñada,
      a.status
    FROM animals a
    CROSS JOIN user_cabana u
    WHERE a.cabaña_id = u.cabaña_id
      AND a.corral_id IS NOT NULL
      AND a.status NOT IN ('vendido', 'muerto')
  ),
  weight_stats AS (
    SELECT 
      ca.corral_id,
      AVG(ca.peso_actual_kg) as avg_weight,
      AVG(ca.ganancia_diaria_kg) as avg_daily_gain
    FROM corral_animals ca
    WHERE ca.peso_actual_kg IS NOT NULL
    GROUP BY ca.corral_id
  ),
  health_data AS (
    SELECT 
      ca.corral_id,
      COUNT(DISTINCT ca.animal_id) as total_animals,
      COUNT(DISTINCT CASE WHEN ca.peso_actual_kg > 0 AND ca.ganancia_diaria_kg > 0 THEN ca.animal_id END) as healthy_animals
    FROM corral_animals ca
    GROUP BY ca.corral_id
  ),
  -- Get applicable requirements per animal
  animal_requirements AS (
    SELECT 
      ca.corral_id,
      ca.animal_id,
      req.id as requirement_id,
      req.frequency_months,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, ca.birth_date)) * 12 + 
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, ca.birth_date)) as animal_age_months
    FROM corral_animals ca
    CROSS JOIN user_cabana u
    CROSS JOIN cabaña_vaccination_requirements req
    WHERE req.cabaña_id = u.cabaña_id
      AND req.is_active = true
      AND (req.sex_restriction IS NULL OR req.sex_restriction = ca.sex)
      AND (req.min_age_months IS NULL OR 
           EXTRACT(YEAR FROM AGE(CURRENT_DATE, ca.birth_date)) * 12 + 
           EXTRACT(MONTH FROM AGE(CURRENT_DATE, ca.birth_date)) >= req.min_age_months)
      AND (req.max_age_months IS NULL OR 
           EXTRACT(YEAR FROM AGE(CURRENT_DATE, ca.birth_date)) * 12 + 
           EXTRACT(MONTH FROM AGE(CURRENT_DATE, ca.birth_date)) <= req.max_age_months)
  ),
  -- Get last vaccination date per animal per requirement
  last_vaccinations AS (
    SELECT DISTINCT ON (av.animal_id, av.requirement_id)
      av.animal_id,
      av.requirement_id,
      av.date
    FROM animal_vaccines av
    ORDER BY av.animal_id, av.requirement_id, av.date DESC
  ),
  -- Calculate vaccination compliance per animal
  animal_vaccination_status AS (
    SELECT 
      ar.corral_id,
      ar.animal_id,
      COUNT(DISTINCT ar.requirement_id) as applicable_count,
      COUNT(DISTINCT CASE 
        WHEN lv.date IS NOT NULL 
          AND lv.date + (ar.frequency_months * INTERVAL '1 month') >= CURRENT_DATE 
        THEN ar.requirement_id 
      END) as fulfilled_count,
      COUNT(DISTINCT CASE 
        WHEN lv.date IS NOT NULL 
          AND lv.date + (ar.frequency_months * INTERVAL '1 month') < CURRENT_DATE - INTERVAL '30 days' 
        THEN ar.requirement_id 
      END) as overdue_count
    FROM animal_requirements ar
    LEFT JOIN last_vaccinations lv ON lv.animal_id = ar.animal_id AND lv.requirement_id = ar.requirement_id
    GROUP BY ar.corral_id, ar.animal_id
  ),
  vaccination_summary AS (
    SELECT 
      avs.corral_id,
      AVG(
        CASE 
          WHEN avs.applicable_count > 0 
          THEN (avs.fulfilled_count::numeric / avs.applicable_count * 100)
          ELSE 0
        END
      ) as vaccination_percentage,
      SUM(avs.overdue_count) as vaccination_alerts
    FROM animal_vaccination_status avs
    GROUP BY avs.corral_id
  ),
  reproductive_data AS (
    SELECT 
      ca.corral_id,
      COUNT(DISTINCT CASE WHEN ca.sex = 'Hembra' THEN ca.animal_id END) as total_females,
      COUNT(DISTINCT CASE WHEN ca.sex = 'Hembra' AND ca.esta_preñada THEN ca.animal_id END) as pregnant_females
    FROM corral_animals ca
    GROUP BY ca.corral_id
  ),
  reproductive_summary AS (
    SELECT 
      rd.corral_id,
      CASE 
        WHEN rd.total_females > 0 
        THEN (rd.pregnant_females::numeric / rd.total_females * 100)
        ELSE 0
      END as reproductive_percentage
    FROM reproductive_data rd
  ),
  financial_data AS (
    SELECT 
      a.corral_id,
      COALESCE(SUM(CASE WHEN f.type = 'ingreso' THEN f.amount ELSE -f.amount END), 0) as balance
    FROM animals a
    CROSS JOIN user_cabana u
    LEFT JOIN finances f ON f.cabaña_id = u.cabaña_id
    WHERE a.cabaña_id = u.cabaña_id
      AND a.corral_id IS NOT NULL
      AND a.status NOT IN ('vendido', 'muerto')
    GROUP BY a.corral_id
  )
  SELECT 
    c.id as corral_id,
    c.name as corral_name,
    COALESCE(hd.total_animals, 0) as animal_count,
    ROUND(COALESCE(ws.avg_weight, 0), 2) as avg_weight,
    ROUND(COALESCE(ws.avg_daily_gain, 0), 3) as avg_daily_gain,
    ROUND(COALESCE((hd.healthy_animals::numeric / NULLIF(hd.total_animals, 0) * 100), 0), 1) as health_percentage,
    ROUND(COALESCE(vs.vaccination_percentage, 0), 1) as vaccination_percentage,
    ROUND(COALESCE(rs.reproductive_percentage, 0), 1) as reproductive_percentage,
    ROUND(COALESCE(fd.balance, 0), 2) as financial_balance,
    0 as health_alerts,
    COALESCE(vs.vaccination_alerts, 0) as vaccination_alerts,
    0 as reproductive_alerts
  FROM corrales c
  CROSS JOIN user_cabana u
  LEFT JOIN health_data hd ON hd.corral_id = c.id
  LEFT JOIN weight_stats ws ON ws.corral_id = c.id
  LEFT JOIN vaccination_summary vs ON vs.corral_id = c.id
  LEFT JOIN reproductive_summary rs ON rs.corral_id = c.id
  LEFT JOIN financial_data fd ON fd.corral_id = c.id
  WHERE c.cabaña_id = u.cabaña_id
  ORDER BY c.name;
END;
$$;