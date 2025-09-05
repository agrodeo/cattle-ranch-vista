-- Fix return type mismatch in rpc_reproductive_detailed_metrics function
DROP FUNCTION IF EXISTS public.rpc_reproductive_detailed_metrics(uuid, jsonb);

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
           CASE 
             WHEN a.birth_date IS NOT NULL 
             THEN (EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)))::integer
             ELSE NULL 
           END as age_in_months
    FROM public.animals a
    LEFT JOIN public.corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = cabana_uuid
      AND a.sex = 'Hembra'
      AND (
        a.birth_date IS NULL 
        OR (a.birth_date <= CURRENT_DATE AND (EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))) >= 18)
      )
      AND (include_sold_dead OR a.status NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
  ),
  reproductive_calculations AS (
    SELECT 
      ef.id as animal_id,
      ef.id_tag as tag,
      ef.name,
      ef.age_in_months,
      ef.animal_category as category,
      ef.corral_id,
      ef.corral_name,
      ef.esta_preñada as is_pregnant,
      ef.fecha_ultima_preñez as pregnancy_date,
      ef.fecha_probable_parto as expected_calving_date,
      
      -- FIXED: Cast reproductive years calculation to INTEGER to match return type
      GREATEST(1, 
        CASE 
          WHEN ef.age_in_months IS NOT NULL AND ef.age_in_months >= 18 
          THEN CEIL((ef.age_in_months - 18)::NUMERIC / 12)::INTEGER
          ELSE 1 
        END
      ) as reproductive_years,
      
      -- Count services for this animal
      COALESCE((
        SELECT COUNT(*)
        FROM public.ia
        JOIN public.eventos e ON ia.evento_id = e.id
        WHERE e.cabaña_id = cabana_uuid
          AND ef.id = ANY(ia.animales_ids)
      ), 0) as lifetime_services,
      
      -- Count confirmed pregnancies
      COALESCE((
        SELECT COUNT(*)
        FROM public.preñeces p
        WHERE p.animal_id = ef.id 
          AND p.cabaña_id = cabana_uuid
          AND p.estado = 'confirmada'
      ), 0) as confirmed_pregnancies,
      
      -- Count pending pregnancies
      COALESCE((
        SELECT COUNT(*)
        FROM public.preñeces p
        WHERE p.animal_id = ef.id 
          AND p.cabaña_id = cabana_uuid
          AND p.estado = 'pendiente'
      ), 0) as pending_pregnancies,
      
      -- Count offspring (calvings)
      COALESCE((
        SELECT COUNT(*)
        FROM public.animals offspring
        WHERE offspring.mother_id = ef.id 
          AND offspring.cabaña_id = cabana_uuid
      ), 0) as offspring,
      
      -- Last service date
      (
        SELECT MAX(e.fecha)
        FROM public.ia
        JOIN public.eventos e ON ia.evento_id = e.id
        WHERE e.cabaña_id = cabana_uuid
          AND ef.id = ANY(ia.animales_ids)
      ) as last_service_date
      
    FROM eligible_females ef
  ),
  final_calculations AS (
    SELECT 
      rc.*,
      rc.confirmed_pregnancies + rc.pending_pregnancies as lifetime_pregnancies,
      rc.offspring as lifetime_calvings,
      
      -- Calculate days open (simplified)
      CASE 
        WHEN rc.last_service_date IS NOT NULL 
        THEN CURRENT_DATE - rc.last_service_date
        ELSE 0 
      END as days_open,
      
      -- Calculate individual pregnancy rate (fixed - no /10.0 division, capped at 100%)
      LEAST(100.0, 
        CASE 
          WHEN rc.reproductive_years > 0 
          THEN ((rc.confirmed_pregnancies + rc.pending_pregnancies + rc.offspring)::NUMERIC / rc.reproductive_years::NUMERIC) * 100
          ELSE 0 
        END
      ) as individual_pregnancy_rate,
      
      -- Calculate calving rate
      CASE 
        WHEN (rc.confirmed_pregnancies + rc.pending_pregnancies) > 0 
        THEN (rc.offspring::NUMERIC / (rc.confirmed_pregnancies + rc.pending_pregnancies)::NUMERIC) * 100
        ELSE 0 
      END as individual_calving_rate
      
    FROM reproductive_calculations rc
  )
  SELECT 
    fc.animal_id,
    fc.tag,
    fc.name,
    fc.age_in_months,
    fc.category,
    fc.corral_id,
    fc.corral_name,
    fc.is_pregnant,
    fc.pregnancy_date,
    fc.expected_calving_date,
    fc.last_service_date,
    fc.days_open,
    fc.reproductive_years,
    fc.lifetime_calvings as total_offspring,
    fc.lifetime_services,
    fc.lifetime_pregnancies,
    fc.lifetime_calvings,
    ROUND(fc.individual_pregnancy_rate, 1) as individual_pregnancy_rate,
    ROUND(fc.individual_calving_rate, 1) as individual_calving_rate,
    
    -- Performance level based on corrected pregnancy rate
    CASE 
      WHEN fc.individual_pregnancy_rate >= 80 THEN 'Excelente'
      WHEN fc.individual_pregnancy_rate >= 60 THEN 'Bueno'
      WHEN fc.individual_pregnancy_rate >= 40 THEN 'Regular'
      ELSE 'Bajo'
    END as performance_level,
    
    0 as active_alerts, -- Placeholder for alerts
    ARRAY[]::text[] as alert_types -- Placeholder for alert types
    
  FROM final_calculations fc
  WHERE (performance_filter IS NULL OR 
    CASE 
      WHEN fc.individual_pregnancy_rate >= 80 THEN 'Excelente'
      WHEN fc.individual_pregnancy_rate >= 60 THEN 'Bueno'
      WHEN fc.individual_pregnancy_rate >= 40 THEN 'Regular'
      ELSE 'Bajo'
    END = performance_filter)
  ORDER BY fc.individual_pregnancy_rate DESC, fc.tag;
END;
$function$;