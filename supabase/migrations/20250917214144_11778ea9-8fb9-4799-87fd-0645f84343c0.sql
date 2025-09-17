-- Fix the age calculation in the reproductive KPIs function
DROP FUNCTION IF EXISTS calculate_reproductive_kpis(uuid);

CREATE OR REPLACE FUNCTION calculate_reproductive_kpis(_cabana_id uuid)
RETURNS TABLE(
  animal_id uuid,
  id_tag text,
  name text,
  age_months integer,
  category text,
  corral_id uuid,
  corral_name text,
  is_pregnant boolean,
  pregnancy_date date,
  expected_calving_date date,
  last_service_date date,
  days_open integer,
  reproductive_years integer,
  total_offspring integer,
  lifetime_services integer,
  lifetime_pregnancies integer,
  lifetime_calvings integer,
  individual_pregnancy_rate numeric,
  individual_calving_rate numeric,
  performance_level text,
  active_alerts integer,
  alert_types text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH eligible_females AS (
    SELECT 
      a.id,
      a.id_tag,
      a.name,
      a.birth_date,
      a.corral_id,
      c.name as corral_name,
      a.esta_preñada,
      a.fecha_ultima_preñez,
      a.fecha_probable_parto,
      -- Fix age calculation: use proper date arithmetic
      CASE 
        WHEN a.birth_date IS NOT NULL THEN
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date))::integer * 12 + 
          EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::integer
        ELSE 24 -- Default for animals without birth date
      END as calculated_age_months
    FROM animals a
    LEFT JOIN corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = _cabana_id
      AND a.sex = 'Hembra'
      AND a.status NOT IN ('vendido', 'muerto')
  ),
  reproductive_females AS (
    SELECT *
    FROM eligible_females
    WHERE calculated_age_months >= 15 -- Only females 15+ months
  ),
  offspring_counts AS (
    SELECT 
      mother_id,
      COUNT(*) as offspring_count
    FROM animals
    WHERE mother_id IS NOT NULL
      AND cabaña_id = _cabana_id
    GROUP BY mother_id
  ),
  service_counts AS (
    SELECT 
      unnest(ia.animales_ids) as animal_id,
      COUNT(*) as service_count
    FROM ia
    JOIN eventos e ON ia.evento_id = e.id
    WHERE e.cabaña_id = _cabana_id
    GROUP BY animal_id
  ),
  pregnancy_counts AS (
    SELECT 
      animal_id,
      COUNT(*) as pregnancy_count,
      COUNT(CASE WHEN estado_final = 'exitosa' THEN 1 END) as successful_pregnancies
    FROM preñeces
    WHERE cabaña_id = _cabana_id
    GROUP BY animal_id
  ),
  alert_counts AS (
    SELECT 
      animal_id,
      COUNT(*) as alert_count,
      array_agg(DISTINCT alert_type) as alert_type_list
    FROM reproductive_alerts
    WHERE cabaña_id = _cabana_id
      AND status = 'pending'
    GROUP BY animal_id
  )
  SELECT 
    rf.id,
    rf.id_tag,
    rf.name,
    rf.calculated_age_months,
    CASE 
      WHEN rf.calculated_age_months < 12 THEN 'Ternera'
      WHEN rf.calculated_age_months < 24 THEN 'Vaquillona'
      ELSE 'Vaca'
    END as category,
    rf.corral_id,
    rf.corral_name,
    COALESCE(rf.esta_preñada, false),
    rf.fecha_ultima_preñez,
    rf.fecha_probable_parto,
    NULL::date as last_service_date, -- TODO: implement
    0 as days_open, -- TODO: implement
    GREATEST(1, CEIL((rf.calculated_age_months - 15) / 12.0)) as reproductive_years,
    COALESCE(oc.offspring_count, 0)::integer,
    COALESCE(sc.service_count, 0)::integer,
    COALESCE(pc.pregnancy_count, 0)::integer,
    COALESCE(pc.successful_pregnancies, 0)::integer,
    CASE 
      WHEN COALESCE(sc.service_count, 0) > 0 
      THEN ROUND((COALESCE(pc.pregnancy_count, 0)::numeric / sc.service_count::numeric) * 100, 1)
      ELSE 0
    END as individual_pregnancy_rate,
    CASE 
      WHEN COALESCE(pc.pregnancy_count, 0) > 0 
      THEN ROUND((COALESCE(pc.successful_pregnancies, 0)::numeric / pc.pregnancy_count::numeric) * 100, 1)
      ELSE 0
    END as individual_calving_rate,
    CASE 
      WHEN COALESCE(sc.service_count, 0) = 0 THEN 'Sin servicios'
      WHEN COALESCE(pc.pregnancy_count, 0)::numeric / NULLIF(sc.service_count, 0) >= 0.8 THEN 'Excelente'
      WHEN COALESCE(pc.pregnancy_count, 0)::numeric / NULLIF(sc.service_count, 0) >= 0.6 THEN 'Bueno'
      WHEN COALESCE(pc.pregnancy_count, 0)::numeric / NULLIF(sc.service_count, 0) >= 0.4 THEN 'Regular'
      ELSE 'Bajo'
    END as performance_level,
    COALESCE(ac.alert_count, 0)::integer,
    COALESCE(ac.alert_type_list, ARRAY[]::text[])
  FROM reproductive_females rf
  LEFT JOIN offspring_counts oc ON rf.id = oc.mother_id
  LEFT JOIN service_counts sc ON rf.id = sc.animal_id
  LEFT JOIN pregnancy_counts pc ON rf.id = pc.animal_id
  LEFT JOIN alert_counts ac ON rf.id = ac.animal_id
  ORDER BY rf.id_tag;
END;
$$;