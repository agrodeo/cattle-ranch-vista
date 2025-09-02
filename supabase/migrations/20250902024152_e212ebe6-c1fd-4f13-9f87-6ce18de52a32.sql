-- Fix the corral KPIs function that was referencing non-existent pregnancy_rate column
CREATE OR REPLACE FUNCTION public.rpc_report_corrals_last_season(_user_id uuid)
 RETURNS TABLE(corral_id uuid, name text, headcount integer, pregnancy_rate numeric, calving_rate numeric, avg_adg_season numeric, avg_weight numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
BEGIN
  -- Get user's cabaña
  SELECT cabana_id INTO cabana_uuid FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;
  
  RETURN QUERY
  WITH corral_animals AS (
    SELECT 
      c.id as corral_id,
      c.name,
      COUNT(a.id) as headcount,
      COUNT(CASE WHEN a.sex = 'Hembra' AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 15 THEN 1 END) as eligible_females,
      COUNT(CASE WHEN a.esta_preñada = true THEN 1 END) as pregnant_females,
      AVG(CASE WHEN a.ganancia_diaria_kg IS NOT NULL THEN a.ganancia_diaria_kg END) as avg_adg,
      AVG(CASE WHEN a.peso_actual_kg IS NOT NULL THEN a.peso_actual_kg END) as avg_weight
    FROM public.corrales c
    LEFT JOIN public.animals a ON c.id = a.corral_id 
      AND a.cabaña_id = cabana_uuid
      AND a.status NOT IN ('vendido', 'muerto')
    WHERE c.cabaña_id = cabana_uuid
    GROUP BY c.id, c.name
  )
  SELECT 
    ca.corral_id,
    ca.name,
    ca.headcount,
    CASE 
      WHEN ca.eligible_females > 0 THEN ROUND((ca.pregnant_females::numeric / ca.eligible_females::numeric) * 100, 1)
      ELSE 0 
    END as pregnancy_rate,
    0::numeric as calving_rate, -- TODO: implement calving tracking
    ROUND(COALESCE(ca.avg_adg, 0), 3) as avg_adg_season,
    ROUND(COALESCE(ca.avg_weight, 0), 1) as avg_weight
  FROM corral_animals ca
  WHERE ca.headcount > 0
  ORDER BY ca.pregnancy_rate DESC, ca.name;
END;
$function$;

-- Fix the EXTRACT issue in the reproduction animals function
CREATE OR REPLACE FUNCTION public.rpc_report_reproduction_animals(_user_id uuid, filters_json jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(animal_id uuid, tag text, name text, category text, corral_id uuid, corral_name text, exposures integer, pregnancies integer, pregnancy_rate numeric, calvings integer, live_calvings integer, calving_rate numeric, live_calving_rate numeric, open_days integer, is_repeater boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
  include_sold_dead boolean := COALESCE((filters_json->>'include_sold_dead')::boolean, false);
  season_filter text := filters_json->>'season';
  date_from_filter date := (filters_json->>'date_from')::date;
  date_to_filter date := (filters_json->>'date_to')::date;
  corral_ids_filter uuid[] := ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids'))::uuid[];
  category_filter text := filters_json->>'category';
  breed_filter text := filters_json->>'breed';
BEGIN
  -- Get user's cabaña
  SELECT cabana_id INTO cabana_uuid FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;
  
  -- Set default date range if not provided (last 365 days)
  IF date_from_filter IS NULL THEN
    date_from_filter := CURRENT_DATE - INTERVAL '365 days';
  END IF;
  IF date_to_filter IS NULL THEN
    date_to_filter := CURRENT_DATE;
  END IF;
  
  RETURN QUERY
  WITH eligible_females AS (
    SELECT a.*,
           c.name as corral_name,
           public.categorize_animal(a.birth_date, a.sex) as animal_category
    FROM public.animals a
    LEFT JOIN public.corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = cabana_uuid
      AND a.sex = 'Hembra'
      AND (a.birth_date IS NULL OR EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 15) -- At least 15 months old
      AND (include_sold_dead OR a.status NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
      AND (category_filter IS NULL OR public.categorize_animal(a.birth_date, a.sex) = category_filter)
      AND (breed_filter IS NULL OR a.breed = breed_filter)
  ),
  services_data AS (
    SELECT DISTINCT
      animal_id,
      service_date
    FROM (
      SELECT 
        unnest(ia.animales_ids) as animal_id,
        e.fecha as service_date
      FROM public.ia 
      JOIN public.eventos e ON ia.evento_id = e.id
      WHERE e.cabaña_id = cabana_uuid
        AND e.fecha BETWEEN date_from_filter AND date_to_filter
    ) sub
    WHERE animal_id IS NOT NULL
  ),
  preg_checks_data AS (
    SELECT DISTINCT
      animal_id,
      check_date,
      result
    FROM (
      SELECT 
        (result_item->>'animal_id')::uuid as animal_id,
        sub.fecha as check_date,
        (result_item->>'resultado')::text as result
      FROM (
        SELECT 
          jsonb_array_elements(tactos.resultados) as result_item,
          e.fecha
        FROM public.tactos
        JOIN public.eventos e ON tactos.evento_id = e.id
        WHERE e.cabaña_id = cabana_uuid
          AND e.fecha BETWEEN date_from_filter AND date_to_filter
      ) sub
    ) sub2
    WHERE animal_id IS NOT NULL
  ),
  animal_stats AS (
    SELECT 
      ef.id as animal_id,
      ef.id_tag as tag,
      ef.name,
      ef.animal_category as category,
      ef.corral_id,
      ef.corral_name,
      
      -- Count exposures (unique service dates)
      COALESCE(COUNT(DISTINCT sd.service_date), 0) as exposures,
      
      -- Count pregnancies (unique positive preg checks)
      COALESCE(COUNT(DISTINCT CASE WHEN pcd.result = 'preñada' THEN pcd.check_date END), 0) as pregnancies,
      
      -- Count services without pregnancy (repeaters logic)
      CASE 
        WHEN COUNT(DISTINCT sd.service_date) >= 2 
         AND COUNT(DISTINCT CASE WHEN pcd.result = 'preñada' THEN pcd.check_date END) = 0
        THEN true 
        ELSE false 
      END as is_repeater,
      
      -- Calculate open days (simplified - days since last calving to first service)
      COALESCE(
        EXTRACT(DAY FROM (MIN(sd.service_date) - COALESCE(ef.fecha_probable_parto, CURRENT_DATE - INTERVAL '365 days')))::integer,
        0
      ) as open_days
      
    FROM eligible_females ef
    LEFT JOIN services_data sd ON ef.id = sd.animal_id
    LEFT JOIN preg_checks_data pcd ON ef.id = pcd.animal_id
    GROUP BY ef.id, ef.id_tag, ef.name, ef.animal_category, ef.corral_id, ef.corral_name, ef.fecha_probable_parto
  )
  SELECT 
    ast.animal_id,
    ast.tag,
    ast.name,
    ast.category,
    ast.corral_id,
    ast.corral_name,
    ast.exposures,
    ast.pregnancies,
    CASE 
      WHEN ast.exposures > 0 THEN ROUND((ast.pregnancies::numeric / ast.exposures::numeric) * 100, 1)
      ELSE 0 
    END as pregnancy_rate,
    0 as calvings, -- TODO: implement calving tracking
    0 as live_calvings, -- TODO: implement calving tracking  
    0::numeric as calving_rate, -- TODO: implement
    0::numeric as live_calving_rate, -- TODO: implement
    ast.open_days,
    ast.is_repeater
  FROM animal_stats ast
  WHERE ast.exposures > 0 OR ast.pregnancies > 0 -- Only show animals with reproductive activity
  ORDER BY ast.pregnancy_rate DESC, ast.tag;
END;
$function$;