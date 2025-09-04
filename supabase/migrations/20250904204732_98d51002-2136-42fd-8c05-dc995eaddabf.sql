CREATE OR REPLACE FUNCTION public.rpc_reproductive_detailed_metrics(_user_id uuid, filters_json jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(animal_id uuid, tag text, name text, age_months integer, category text, corral_id uuid, corral_name text, is_pregnant boolean, pregnancy_date date, expected_calving_date date, last_service_date date, days_open integer, reproductive_years integer, total_offspring integer, lifetime_services integer, lifetime_pregnancies integer, lifetime_calvings integer, individual_pregnancy_rate numeric, individual_calving_rate numeric, performance_level text, active_alerts integer, alert_types text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
  include_sold_dead boolean := COALESCE((filters_json->>'include_sold_dead')::boolean, false);
  performance_filter text := filters_json->>'performance';
  alert_status_filter text := filters_json->>'alert_status';
  corral_ids_filter uuid[] := ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids'))::uuid[];
BEGIN
  -- Get user's cabaña
  SELECT cabana_id INTO cabana_uuid FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;
  
  RETURN QUERY
  WITH eligible_females AS (
    SELECT 
      a.id,
      a.id_tag,
      a.name,
      a.birth_date,
      a.corral_id,
      a.esta_preñada,
      a.fecha_ultima_preñez,
      a.fecha_probable_parto,
      c.name as corral_name,
      public.categorize_animal(a.birth_date, a.sex) as animal_category,
      CASE 
        WHEN a.birth_date IS NOT NULL AND a.birth_date <= CURRENT_DATE 
        THEN DATE_PART('year', AGE(CURRENT_DATE, a.birth_date))::integer * 12 + DATE_PART('month', AGE(CURRENT_DATE, a.birth_date))::integer
        ELSE NULL 
      END as age_in_months
    FROM public.animals a
    LEFT JOIN public.corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = cabana_uuid
      AND a.sex = 'Hembra'
      AND (
        a.birth_date IS NULL 
        OR (a.birth_date <= CURRENT_DATE AND DATE_PART('year', AGE(CURRENT_DATE, a.birth_date)) * 12 + DATE_PART('month', AGE(CURRENT_DATE, a.birth_date)) >= 15)
      )
      AND (include_sold_dead OR LOWER(COALESCE(a.status, 'activo')) NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR array_length(corral_ids_filter, 1) IS NULL OR a.corral_id = ANY(corral_ids_filter))
  ),
  alerts_data AS (
    SELECT 
      ra.animal_id,
      COUNT(*) as alert_count,
      array_agg(ra.alert_type) as alert_types_array
    FROM public.reproductive_alerts ra
    WHERE ra.status = 'pending'
      AND ra.cabaña_id = cabana_uuid
    GROUP BY ra.animal_id
  ),
  reproductive_stats AS (
    SELECT 
      ef.id as animal_id,
      ef.id_tag as tag,
      ef.name,
      ef.age_in_months,
      ef.animal_category as category,
      ef.corral_id,
      ef.corral_name,
      COALESCE(ef.esta_preñada, false) as is_pregnant,
      ef.fecha_ultima_preñez as pregnancy_date,
      ef.fecha_probable_parto as expected_calving_date,
      NULL::date as last_service_date, -- TODO: Calculate from IA records
      0 as days_open, -- TODO: Calculate properly
      GREATEST(1, COALESCE(DATE_PART('year', AGE(CURRENT_DATE, COALESCE(ef.birth_date, CURRENT_DATE - INTERVAL '3 years')))::integer - 1, 1)) as reproductive_years,
      0 as total_offspring, -- TODO: Calculate from animals with this as mother
      0 as lifetime_services, -- TODO: Calculate from IA records
      CASE WHEN ef.esta_preñada THEN 1 ELSE 0 END as lifetime_pregnancies,
      0 as lifetime_calvings, -- TODO: Calculate from offspring
      -- Calculate basic pregnancy rate
      CASE 
        WHEN ef.esta_preñada THEN 100.0
        ELSE 50.0 -- Default for females without current pregnancy
      END as individual_pregnancy_rate,
      0.0 as individual_calving_rate, -- TODO: Calculate properly
      -- Performance level based on pregnancy status
      CASE 
        WHEN ef.esta_preñada THEN 'Excelente'
        ELSE 'Bueno'
      END as performance_level,
      COALESCE(ad.alert_count, 0)::integer as active_alerts,
      COALESCE(ad.alert_types_array, ARRAY[]::text[]) as alert_types
    FROM eligible_females ef
    LEFT JOIN alerts_data ad ON ef.id = ad.animal_id
  )
  SELECT 
    rs.animal_id,
    rs.tag,
    rs.name,
    rs.age_in_months,
    rs.category,
    rs.corral_id,
    rs.corral_name,
    rs.is_pregnant,
    rs.pregnancy_date,
    rs.expected_calving_date,
    rs.last_service_date,
    rs.days_open,
    rs.reproductive_years,
    rs.total_offspring,
    rs.lifetime_services,
    rs.lifetime_pregnancies,
    rs.lifetime_calvings,
    rs.individual_pregnancy_rate,
    rs.individual_calving_rate,
    rs.performance_level,
    rs.active_alerts,
    rs.alert_types
  FROM reproductive_stats rs
  WHERE (performance_filter IS NULL OR rs.performance_level = performance_filter)
    AND (
      alert_status_filter IS NULL 
      OR (alert_status_filter = 'with_alerts' AND rs.active_alerts > 0) 
      OR (alert_status_filter = 'no_alerts' AND rs.active_alerts = 0)
    )
  ORDER BY rs.tag;
END;
$function$;