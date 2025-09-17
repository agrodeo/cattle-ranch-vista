-- Create enhanced reproductive metrics function that integrates individual KPIs with calculated metrics
CREATE OR REPLACE FUNCTION public.get_enhanced_reproductive_metrics(_cabana_id uuid, _filters jsonb DEFAULT '{}'::jsonb)
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
  reproductive_years numeric,
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
SET search_path TO 'public'
AS $function$
DECLARE
  corral_ids_filter uuid[] := NULL;
  include_sold_dead boolean := COALESCE((_filters->>'include_sold_dead')::boolean, false);
BEGIN
  -- Extract filters
  IF _filters ? 'corral_ids' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(_filters->'corral_ids'))::uuid[] INTO corral_ids_filter;
  END IF;

  -- First ensure individual KPIs are calculated
  PERFORM public.calculate_individual_kpis(_cabana_id);

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
      -- Calculate age in months
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
      AND (include_sold_dead OR a.status NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
  ),
  reproductive_females AS (
    SELECT *
    FROM eligible_females
    WHERE calculated_age_months >= 15 -- Only females 15+ months
  ),
  kpi_data AS (
    SELECT 
      rf.*,
      COALESCE(rk.services_count, 0) as services_count,
      COALESCE(rk.pregnancies_count, 0) as pregnancies_count,
      COALESCE(rk.calvings_count, 0) as calvings_count,
      COALESCE(rk.pregnancy_rate, 0) as calculated_pregnancy_rate,
      COALESCE(rk.calving_rate, 0) as calculated_calving_rate,
      GREATEST(1, CEIL((rf.calculated_age_months - 15) / 12.0)) as reproductive_years_calc
    FROM reproductive_females rf
    LEFT JOIN reproductive_kpis rk ON rf.id = rk.animal_id
  ),
  offspring_counts AS (
    SELECT 
      a2.mother_id,
      COUNT(*) as offspring_count
    FROM animals a2
    WHERE a2.mother_id IS NOT NULL
      AND a2.cabaña_id = _cabana_id
      AND a2.status NOT IN ('vendido', 'muerto')
    GROUP BY a2.mother_id
  ),
  alert_counts AS (
    SELECT 
      ra.animal_id as alert_animal_id,
      COUNT(*) as alert_count,
      array_agg(DISTINCT ra.alert_type) as alert_type_list
    FROM reproductive_alerts ra
    WHERE ra.cabaña_id = _cabana_id
      AND ra.status = 'pending'
    GROUP BY ra.animal_id
  ),
  last_service_dates AS (
    SELECT 
      unnest(ia.animales_ids) as service_animal_id,
      MAX(e.fecha) as last_service_date
    FROM ia
    JOIN eventos e ON ia.evento_id = e.id
    WHERE e.cabaña_id = _cabana_id
    GROUP BY service_animal_id
  )
  SELECT 
    kd.id,
    kd.id_tag,
    kd.name,
    kd.calculated_age_months,
    CASE 
      WHEN kd.calculated_age_months < 12 THEN 'Ternera'
      WHEN kd.calculated_age_months < 24 THEN 'Vaquillona'
      ELSE 'Vaca'
    END as category,
    kd.corral_id,
    kd.corral_name,
    COALESCE(kd.esta_preñada, false),
    kd.fecha_ultima_preñez,
    kd.fecha_probable_parto,
    lsd.last_service_date,
    CASE 
      WHEN lsd.last_service_date IS NOT NULL AND NOT COALESCE(kd.esta_preñada, false)
      THEN CURRENT_DATE - lsd.last_service_date
      ELSE 0
    END as days_open,
    kd.reproductive_years_calc,
    COALESCE(oc.offspring_count, 0)::integer,
    kd.services_count::integer,
    kd.pregnancies_count::integer,
    kd.calvings_count::integer,
    kd.calculated_pregnancy_rate,
    kd.calculated_calving_rate,
    CASE 
      WHEN kd.services_count = 0 THEN 'Sin servicios'
      WHEN kd.calculated_pregnancy_rate >= 80 THEN 'Excelente'
      WHEN kd.calculated_pregnancy_rate >= 60 THEN 'Bueno'
      WHEN kd.calculated_pregnancy_rate >= 40 THEN 'Regular'
      ELSE 'Bajo'
    END as performance_level,
    COALESCE(ac.alert_count, 0)::integer,
    COALESCE(ac.alert_type_list, ARRAY[]::text[])
  FROM kpi_data kd
  LEFT JOIN offspring_counts oc ON kd.id = oc.mother_id
  LEFT JOIN alert_counts ac ON kd.id = ac.alert_animal_id
  LEFT JOIN last_service_dates lsd ON kd.id = lsd.service_animal_id
  ORDER BY kd.id_tag;
END;
$function$;