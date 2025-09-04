-- Fix reproductive metrics percentage calculations to cap at 100% and use realistic formulas
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
  offspring_stats AS (
    SELECT 
      ef.id as animal_id,
      COUNT(children.id) as total_children,
      MAX(children.birth_date) as last_calving_date
    FROM eligible_females ef
    LEFT JOIN public.animals children ON ef.id = children.mother_id
      AND children.cabaña_id = cabana_uuid
      AND LOWER(COALESCE(children.status, 'activo')) NOT IN ('vendido', 'muerto')
    GROUP BY ef.id
  ),
  services_stats AS (
    SELECT 
      ef.id as animal_id,
      COUNT(DISTINCT e.id) as total_services,
      MAX(e.fecha) as last_service_date
    FROM eligible_females ef
    JOIN public.ia ON ef.id = ANY(ia.animales_ids)
    JOIN public.eventos e ON ia.evento_id = e.id
    WHERE e.cabaña_id = cabana_uuid
    GROUP BY ef.id
  ),
  pregnancies_stats AS (
    SELECT 
      ef.id as animal_id,
      COUNT(*) FILTER (WHERE p.estado = 'confirmada') as confirmed_pregnancies,
      COUNT(*) as total_pregnancy_records
    FROM eligible_females ef
    LEFT JOIN public.preñeces p ON ef.id = p.animal_id
      AND p.cabaña_id = cabana_uuid
    GROUP BY ef.id
  ),
  tacto_pregnancies AS (
    SELECT 
      ef.id as animal_id,
      COUNT(*) FILTER (WHERE (result_item->>'resultado')::text = 'preñada') as tacto_pregnancies
    FROM eligible_females ef
    JOIN (
      SELECT 
        (result_item->>'animal_id')::uuid as animal_id,
        result_item
      FROM public.tactos t
      JOIN public.eventos e ON t.evento_id = e.id,
      LATERAL jsonb_array_elements(t.resultados) as result_item
      WHERE e.cabaña_id = cabana_uuid
        AND (result_item->>'animal_id') IS NOT NULL
    ) tacto_data ON ef.id = tacto_data.animal_id
    GROUP BY ef.id
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
      COALESCE(ss.last_service_date, ef.fecha_ultima_preñez) as last_service_date,
      -- Calculate days open: days between last calving and first service after calving
      CASE 
        WHEN os.last_calving_date IS NOT NULL AND ss.last_service_date IS NOT NULL 
        THEN GREATEST(0, ss.last_service_date - os.last_calving_date)
        ELSE NULL
      END as days_open,
      -- Calculate realistic reproductive years (minimum 1, maximum actual age - 1)
      GREATEST(1, LEAST(
        COALESCE(DATE_PART('year', AGE(CURRENT_DATE, COALESCE(ef.birth_date, CURRENT_DATE - INTERVAL '3 years')))::integer - 1, 1),
        CASE WHEN ef.birth_date IS NOT NULL THEN 
          GREATEST(1, DATE_PART('year', AGE(CURRENT_DATE, ef.birth_date))::integer - 1)
        ELSE 1 END
      )) as reproductive_years,
      COALESCE(os.total_children, 0)::integer as total_offspring,
      COALESCE(ss.total_services, 0)::integer as lifetime_services,
      -- Use the higher count between preñeces and tacto pregnancies
      GREATEST(
        COALESCE(ps.confirmed_pregnancies, 0),
        COALESCE(tp.tacto_pregnancies, 0),
        CASE WHEN ef.esta_preñada THEN 1 ELSE 0 END
      )::integer as lifetime_pregnancies,
      COALESCE(os.total_children, 0)::integer as lifetime_calvings,
      -- Calculate realistic pregnancy rate: MIN(100, pregnancies per reproductive year * 100)
      LEAST(100.0, 
        CASE 
          WHEN GREATEST(1, LEAST(
            COALESCE(DATE_PART('year', AGE(CURRENT_DATE, COALESCE(ef.birth_date, CURRENT_DATE - INTERVAL '3 years')))::integer - 1, 1),
            CASE WHEN ef.birth_date IS NOT NULL THEN 
              GREATEST(1, DATE_PART('year', AGE(CURRENT_DATE, ef.birth_date))::integer - 1)
            ELSE 1 END
          )) > 0 THEN 
            ROUND(
              (GREATEST(
                COALESCE(ps.confirmed_pregnancies, 0),
                COALESCE(tp.tacto_pregnancies, 0),
                CASE WHEN ef.esta_preñada THEN 1 ELSE 0 END
              )::NUMERIC / 
              GREATEST(1, LEAST(
                COALESCE(DATE_PART('year', AGE(CURRENT_DATE, COALESCE(ef.birth_date, CURRENT_DATE - INTERVAL '3 years')))::integer - 1, 1),
                CASE WHEN ef.birth_date IS NOT NULL THEN 
                  GREATEST(1, DATE_PART('year', AGE(CURRENT_DATE, ef.birth_date))::integer - 1)
                ELSE 1 END
              ))::NUMERIC) * 100, 1
            )
          ELSE 0.0
        END
      ) as individual_pregnancy_rate,
      -- Calculate realistic calving rate: MIN(100, calvings / pregnancies * 100)
      LEAST(100.0,
        CASE 
          WHEN GREATEST(
            COALESCE(ps.confirmed_pregnancies, 0),
            COALESCE(tp.tacto_pregnancies, 0),
            CASE WHEN ef.esta_preñada THEN 1 ELSE 0 END
          ) > 0 THEN 
            ROUND(
              (COALESCE(os.total_children, 0)::NUMERIC / 
               GREATEST(
                 COALESCE(ps.confirmed_pregnancies, 0),
                 COALESCE(tp.tacto_pregnancies, 0),
                 CASE WHEN ef.esta_preñada THEN 1 ELSE 0 END
               )::NUMERIC) * 100, 1
            )
          -- If no pregnancies recorded but has calvings, use annual calving rate
          WHEN COALESCE(os.total_children, 0) > 0 THEN
            ROUND(
              (COALESCE(os.total_children, 0)::NUMERIC / 
               GREATEST(1, LEAST(
                 COALESCE(DATE_PART('year', AGE(CURRENT_DATE, COALESCE(ef.birth_date, CURRENT_DATE - INTERVAL '3 years')))::integer - 1, 1),
                 CASE WHEN ef.birth_date IS NOT NULL THEN 
                   GREATEST(1, DATE_PART('year', AGE(CURRENT_DATE, ef.birth_date))::integer - 1)
                 ELSE 1 END
               ))::NUMERIC) * 100, 1
            )
          ELSE 0.0
        END
      ) as individual_calving_rate,
      COALESCE(ad.alert_count, 0)::integer as active_alerts,
      COALESCE(ad.alert_types_array, ARRAY[]::text[]) as alert_types
    FROM eligible_females ef
    LEFT JOIN offspring_stats os ON ef.id = os.animal_id
    LEFT JOIN services_stats ss ON ef.id = ss.animal_id
    LEFT JOIN pregnancies_stats ps ON ef.id = ps.animal_id
    LEFT JOIN tacto_pregnancies tp ON ef.id = tp.animal_id
    LEFT JOIN alerts_data ad ON ef.id = ad.animal_id
  ),
  final_stats AS (
    SELECT 
      rs.*,
      -- Determine performance level based on pregnancy rate (now capped at 100%)
      CASE 
        WHEN rs.individual_pregnancy_rate >= 80 THEN 'Excelente'
        WHEN rs.individual_pregnancy_rate >= 60 THEN 'Bueno'
        WHEN rs.individual_pregnancy_rate >= 40 THEN 'Regular'
        ELSE 'Bajo'
      END as performance_level
    FROM reproductive_stats rs
  )
  SELECT 
    fs.animal_id,
    fs.tag,
    fs.name,
    fs.age_in_months,
    fs.category,
    fs.corral_id,
    fs.corral_name,
    fs.is_pregnant,
    fs.pregnancy_date,
    fs.expected_calving_date,
    fs.last_service_date,
    fs.days_open,
    fs.reproductive_years,
    fs.total_offspring,
    fs.lifetime_services,
    fs.lifetime_pregnancies,
    fs.lifetime_calvings,
    fs.individual_pregnancy_rate,
    fs.individual_calving_rate,
    fs.performance_level,
    fs.active_alerts,
    fs.alert_types
  FROM final_stats fs
  WHERE (performance_filter IS NULL OR fs.performance_level = performance_filter)
    AND (
      alert_status_filter IS NULL 
      OR (alert_status_filter = 'with_alerts' AND fs.active_alerts > 0) 
      OR (alert_status_filter = 'no_alerts' AND fs.active_alerts = 0)
    )
  ORDER BY fs.tag;
END;
$function$;