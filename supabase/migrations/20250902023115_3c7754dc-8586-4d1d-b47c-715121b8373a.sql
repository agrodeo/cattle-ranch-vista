-- Fix the broken RPC functions that are causing the errors

-- First fix the reproduction animals report function
CREATE OR REPLACE FUNCTION public.rpc_report_reproduction_animals(_user_id uuid, filters_json jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(animal_id uuid, tag text, name text, category text, corral_id uuid, corral_name text, exposures integer, pregnancies integer, pregnancy_rate numeric, calvings integer, live_calvings integer, calving_rate numeric, live_calving_rate numeric, open_days integer, is_repeater boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cabana_uuid uuid;
  include_sold_dead boolean := COALESCE((filters_json->>'include_sold_dead')::boolean, false);
  date_from_filter date := COALESCE((filters_json->>'date_from')::date, CURRENT_DATE - INTERVAL '365 days');
  date_to_filter date := COALESCE((filters_json->>'date_to')::date, CURRENT_DATE);
  corral_ids_filter uuid[] := ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids'))::uuid[];
  category_filter text := filters_json->>'category';
  breed_filter text := filters_json->>'breed';
BEGIN
  -- Get user's cabaña
  SELECT cabaña_id INTO cabana_uuid FROM public.users WHERE id = _user_id;
  IF cabana_uuid IS NULL THEN
    SELECT cabana_id INTO cabana_uuid FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  END IF;
  
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
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
      AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 15 -- At least 15 months old
      AND (include_sold_dead OR a.status NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
      AND (category_filter IS NULL OR public.categorize_animal(a.birth_date, a.sex) = category_filter)
      AND (breed_filter IS NULL OR a.breed = breed_filter)
  ),
  services_data AS (
    SELECT 
      unnest(ia.animales_ids) as animal_id,
      e.fecha as service_date
    FROM public.ia 
    JOIN public.eventos e ON ia.evento_id = e.id
    WHERE e.cabaña_id = cabana_uuid
      AND e.fecha BETWEEN date_from_filter AND date_to_filter
  ),
  tacto_results AS (
    SELECT 
      (animal_result->>'animal_id')::uuid as animal_id,
      e.fecha as check_date,
      (animal_result->>'resultado')::text as result
    FROM public.tactos t
    JOIN public.eventos e ON t.evento_id = e.id
    CROSS JOIN LATERAL jsonb_array_elements(t.resultados) as animal_result
    WHERE e.cabaña_id = cabana_uuid
      AND e.fecha BETWEEN date_from_filter AND date_to_filter
      AND (animal_result->>'animal_id') IS NOT NULL
  ),
  animal_stats AS (
    SELECT 
      ef.id as animal_id,
      ef.id_tag as tag,
      ef.name,
      ef.animal_category as category,
      ef.corral_id,
      ef.corral_name,
      
      -- Count exposures (services)
      COALESCE(COUNT(DISTINCT sd.service_date), 0) as exposures,
      
      -- Count pregnancies (positive tacto checks)
      COALESCE(COUNT(DISTINCT CASE WHEN tr.result = 'preñada' THEN tr.check_date END), 0) as pregnancies,
      
      -- Count services without pregnancy (repeaters logic)
      CASE 
        WHEN COUNT(DISTINCT sd.service_date) >= 2 
         AND COUNT(DISTINCT CASE WHEN tr.result = 'preñada' THEN tr.check_date END) = 0
        THEN true 
        ELSE false 
      END as is_repeater,
      
      -- Calculate open days (simplified - days since last calving to first service)
      COALESCE(
        EXTRACT(DAY FROM MIN(sd.service_date) - MAX(ef.fecha_probable_parto))::integer,
        0
      ) as open_days
      
    FROM eligible_females ef
    LEFT JOIN services_data sd ON ef.id = sd.animal_id
    LEFT JOIN tacto_results tr ON ef.id = tr.animal_id
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
$$;

-- Create RPC function to calculate reproductive performance for individual animals
CREATE OR REPLACE FUNCTION public.calculate_reproductive_performance(_animal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  animal_record RECORD;
  total_services INTEGER := 0;
  confirmed_pregnancies INTEGER := 0;
  total_calvings INTEGER := 0;
  live_calvings INTEGER := 0;
  reproductive_years INTEGER := 0;
  pregnancy_percentage NUMERIC := 0;
  calving_percentage NUMERIC := 0;
  result JSONB;
BEGIN
  -- Get animal details
  SELECT * INTO animal_record FROM public.animals WHERE id = _animal_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Animal not found"}'::jsonb;
  END IF;
  
  -- Only calculate for females
  IF animal_record.sex != 'Hembra' THEN
    RETURN '{"error": "Only applicable to females"}'::jsonb;
  END IF;
  
  -- Calculate reproductive years (from 15 months old to current)
  reproductive_years := GREATEST(0, 
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, animal_record.birth_date + INTERVAL '15 months'))::INTEGER
  );
  
  -- Count total services (IA records)
  SELECT COUNT(DISTINCT e.fecha) INTO total_services
  FROM public.ia ia
  JOIN public.eventos e ON ia.evento_id = e.id
  WHERE _animal_id = ANY(ia.animales_ids)
    AND e.cabaña_id = animal_record.cabaña_id;
  
  -- Count confirmed pregnancies from tactos
  SELECT COUNT(DISTINCT e.fecha) INTO confirmed_pregnancies
  FROM public.tactos t
  JOIN public.eventos e ON t.evento_id = e.id
  CROSS JOIN LATERAL jsonb_array_elements(t.resultados) as animal_result
  WHERE (animal_result->>'animal_id')::uuid = _animal_id
    AND (animal_result->>'resultado')::text = 'preñada'
    AND e.cabaña_id = animal_record.cabaña_id;
  
  -- Count calvings and live calvings (simplified - using birth records of offspring)
  SELECT 
    COUNT(*) as total_calves,
    COUNT(CASE WHEN status NOT IN ('muerto', 'vendido') THEN 1 END) as live_calves
  INTO total_calvings, live_calvings
  FROM public.animals
  WHERE mother_id = _animal_id
    AND cabaña_id = animal_record.cabaña_id;
  
  -- Calculate percentages
  IF total_services > 0 THEN
    pregnancy_percentage := ROUND((confirmed_pregnancies::numeric / total_services::numeric) * 100, 1);
  END IF;
  
  IF confirmed_pregnancies > 0 THEN
    calving_percentage := ROUND((total_calvings::numeric / confirmed_pregnancies::numeric) * 100, 1);
  END IF;
  
  result := jsonb_build_object(
    'pregnancy_percentage', pregnancy_percentage,
    'calving_percentage', calving_percentage,
    'total_reproductive_years', reproductive_years,
    'confirmed_pregnancies', confirmed_pregnancies,
    'live_calves', live_calvings,
    'total_services', total_services,
    'total_calvings', total_calvings
  );
  
  RETURN result;
END;
$$;