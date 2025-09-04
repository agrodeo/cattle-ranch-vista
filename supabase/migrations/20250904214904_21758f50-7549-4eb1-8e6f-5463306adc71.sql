-- Fix pregnancy percentage calculation to include current pregnancy status correctly
CREATE OR REPLACE FUNCTION public.rpc_reproductive_detailed_metrics(_user_id uuid, filters_json jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(animal_id uuid, tag text, name text, age_months integer, category text, corral_id uuid, corral_name text, is_pregnant boolean, pregnancy_date date, expected_calving_date date, last_service_date date, days_open integer, reproductive_years integer, total_offspring integer, lifetime_services integer, lifetime_pregnancies integer, lifetime_calvings integer, individual_pregnancy_rate numeric, individual_calving_rate numeric, performance_level text, active_alerts integer, alert_types text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
  include_sold_dead boolean := COALESCE((filters_json->>'include_sold_dead')::boolean, false);
  corral_ids_filter uuid[] := ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids'))::uuid[];
  performance_filter text := filters_json->>'performance';
  alert_status_filter text := filters_json->>'alert_status';
BEGIN
  -- Get user's cabaña
  SELECT cabana_id INTO cabana_uuid FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;
  
  RETURN QUERY
  WITH eligible_females AS (
    SELECT a.id,
           a.id_tag,
           a.name,
           a.corral_id,
           a.esta_preñada,
           a.fecha_ultima_preñez,
           a.fecha_probable_parto,
           a.birth_date,
           c.name as corral_name,
           public.categorize_animal(a.birth_date, a.sex) as animal_category,
           -- Calculate age in months
           CASE 
             WHEN a.birth_date IS NOT NULL AND a.birth_date <= CURRENT_DATE 
             THEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::integer
             ELSE NULL 
           END as age_in_months,
           -- Calculate reproductive years (started from 18 months old)
           CASE 
             WHEN a.birth_date IS NOT NULL AND a.birth_date <= CURRENT_DATE 
             THEN GREATEST(0, FLOOR((EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) - 18) / 12.0))::integer
             ELSE 0
           END as reproductive_years
    FROM public.animals a
    LEFT JOIN public.corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = cabana_uuid
      AND a.sex = 'Hembra'
      AND (
        a.birth_date IS NULL 
        OR (a.birth_date <= CURRENT_DATE AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 15)
      ) -- At least 15 months old or no birth date
      AND (include_sold_dead OR a.status NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
  ),
  services_data AS (
    SELECT 
      unnest(ia.animales_ids) as animal_id,
      COUNT(*) as service_count,
      MAX(e.fecha) as last_service_date
    FROM public.ia 
    JOIN public.eventos e ON ia.evento_id = e.id
    WHERE e.cabaña_id = cabana_uuid
    GROUP BY unnest(ia.animales_ids)
  ),
  pregnancies_confirmed AS (
    SELECT 
      p.animal_id,
      COUNT(*) as confirmed_pregnancies
    FROM public.preñeces p
    WHERE p.cabaña_id = cabana_uuid
      AND p.estado = 'confirmada'
    GROUP BY p.animal_id
  ),
  tacto_pregnancies AS (
    SELECT 
      (result_item->>'animal_id')::uuid as animal_id,
      COUNT(*) as tacto_pregnancies
    FROM (
      SELECT 
        jsonb_array_elements(tactos.resultados) as result_item
      FROM public.tactos
      JOIN public.eventos e ON tactos.evento_id = e.id
      WHERE e.cabaña_id = cabana_uuid
    ) sub
    WHERE (result_item->>'animal_id') IS NOT NULL
      AND (result_item->>'resultado')::text = 'preñada'
    GROUP BY (result_item->>'animal_id')::uuid
  ),
  offspring_count AS (
    SELECT 
      mother_id,
      COUNT(*) as total_offspring
    FROM public.animals
    WHERE cabaña_id = cabana_uuid
      AND mother_id IS NOT NULL
      AND status NOT IN ('vendido', 'muerto')
    GROUP BY mother_id
  ),
  alerts_data AS (
    SELECT 
      ra.animal_id,
      COUNT(*) as alert_count,
      array_agg(DISTINCT ra.alert_type) as alert_types_arr
    FROM public.reproductive_alerts ra
    WHERE ra.status = 'pending'
      AND ra.cabaña_id = cabana_uuid
    GROUP BY ra.animal_id
  ),
  final_metrics AS (
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
      sd.last_service_date,
      
      -- Calculate days open (simplified)
      COALESCE(
        CASE 
          WHEN ef.fecha_probable_parto IS NOT NULL 
          THEN EXTRACT(DAY FROM (CURRENT_DATE - ef.fecha_probable_parto))::integer
          ELSE 0 
        END, 
        0
      ) as days_open,
      
      ef.reproductive_years,
      COALESCE(oc.total_offspring, 0)::integer as total_offspring,
      COALESCE(sd.service_count, 0)::integer as lifetime_services,
      
      -- FIXED: Sum all pregnancy sources instead of using GREATEST()
      (COALESCE(pc.confirmed_pregnancies, 0) + 
       COALESCE(tp.tacto_pregnancies, 0) + 
       CASE WHEN ef.esta_preñada THEN 1 ELSE 0 END)::integer as lifetime_pregnancies,
      
      COALESCE(oc.total_offspring, 0)::integer as lifetime_calvings, -- Same as offspring for now
      
      COALESCE(ad.alert_count, 0)::integer as active_alerts,
      COALESCE(ad.alert_types_arr, ARRAY[]::text[]) as alert_types
      
    FROM eligible_females ef
    LEFT JOIN services_data sd ON ef.id = sd.animal_id
    LEFT JOIN pregnancies_confirmed pc ON ef.id = pc.animal_id
    LEFT JOIN tacto_pregnancies tp ON ef.id = tp.animal_id
    LEFT JOIN offspring_count oc ON ef.id = oc.mother_id
    LEFT JOIN alerts_data ad ON ef.id = ad.animal_id
  )
  SELECT 
    fm.animal_id,
    fm.tag,
    fm.name,
    fm.age_in_months,
    fm.category,
    fm.corral_id,
    fm.corral_name,
    fm.is_pregnant,
    fm.pregnancy_date,
    fm.expected_calving_date,
    fm.last_service_date,
    fm.days_open,
    fm.reproductive_years,
    fm.total_offspring,
    fm.lifetime_services,
    fm.lifetime_pregnancies,
    fm.lifetime_calvings,
    
    -- Calculate realistic pregnancy rate: pregnancies / max(services, 1) * 100
    CASE 
      WHEN fm.lifetime_services > 0 THEN 
        ROUND((fm.lifetime_pregnancies::NUMERIC / fm.lifetime_services::NUMERIC) * 100, 1)
      WHEN fm.lifetime_pregnancies > 0 THEN 100.0 -- If pregnant but no services recorded, assume 100%
      ELSE 0.0
    END as individual_pregnancy_rate,
    
    -- Calculate calving rate: calvings / pregnancies * 100
    CASE 
      WHEN fm.lifetime_pregnancies > 0 THEN 
        ROUND((fm.lifetime_calvings::NUMERIC / fm.lifetime_pregnancies::NUMERIC) * 100, 1)
      ELSE 0.0
    END as individual_calving_rate,
    
    -- Determine performance level based on pregnancy rate
    CASE 
      WHEN fm.lifetime_services > 0 THEN
        CASE 
          WHEN (fm.lifetime_pregnancies::NUMERIC / fm.lifetime_services::NUMERIC) * 100 >= 85 THEN 'Excellent'
          WHEN (fm.lifetime_pregnancies::NUMERIC / fm.lifetime_services::NUMERIC) * 100 >= 70 THEN 'Good'
          WHEN (fm.lifetime_pregnancies::NUMERIC / fm.lifetime_services::NUMERIC) * 100 >= 50 THEN 'Regular'
          ELSE 'Low'
        END
      WHEN fm.lifetime_pregnancies > 0 THEN 'Excellent' -- Pregnant without recorded services
      ELSE 'Unknown'
    END as performance_level,
    
    fm.active_alerts,
    fm.alert_types
    
  FROM final_metrics fm
  WHERE (performance_filter IS NULL OR 
         CASE 
           WHEN fm.lifetime_services > 0 THEN
             CASE 
               WHEN (fm.lifetime_pregnancies::NUMERIC / fm.lifetime_services::NUMERIC) * 100 >= 85 THEN 'Excellent'
               WHEN (fm.lifetime_pregnancies::NUMERIC / fm.lifetime_services::NUMERIC) * 100 >= 70 THEN 'Good'
               WHEN (fm.lifetime_pregnancies::NUMERIC / fm.lifetime_services::NUMERIC) * 100 >= 50 THEN 'Regular'
               ELSE 'Low'
             END
           WHEN fm.lifetime_pregnancies > 0 THEN 'Excellent'
           ELSE 'Unknown'
         END = performance_filter)
    AND (alert_status_filter IS NULL OR 
         (alert_status_filter = 'with_alerts' AND fm.active_alerts > 0) OR
         (alert_status_filter = 'no_alerts' AND fm.active_alerts = 0))
  ORDER BY 
    CASE 
      WHEN fm.lifetime_services > 0 THEN (fm.lifetime_pregnancies::NUMERIC / fm.lifetime_services::NUMERIC) * 100
      WHEN fm.lifetime_pregnancies > 0 THEN 100.0
      ELSE 0.0
    END DESC, fm.tag;
END;
$function$