-- Fix all remaining database functions - Final batch of security fixes

-- Continue fixing all remaining functions with SET search_path = 'public'

CREATE OR REPLACE FUNCTION public.create_finance_category(_user_id uuid, _name text, _type text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  cab_id uuid;
  new_id uuid;
  allowed boolean;
BEGIN
  IF COALESCE(TRIM(_name),'') = '' OR _type IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters';
  END IF;

  SELECT cabana_id INTO cab_id FROM get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  allowed := has_role(_user_id, 'admin') OR has_role(_user_id, 'employee');
  IF NOT allowed THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO finance_categories(name, type, "cabaña_id", is_system)
  VALUES (_name, _type, cab_id, false)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_finance_recurring(_user_id uuid, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  cab_id uuid;
  allowed boolean;
BEGIN
  SELECT cabana_id INTO cab_id FROM get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  allowed := has_role(_user_id, 'admin') OR has_role(_user_id, 'employee');
  IF NOT allowed THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM finance_recurring
  WHERE id = _id AND "cabaña_id" = cab_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_death_age()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  birth_date DATE;
BEGIN
  -- Get birth date from animals table
  SELECT a.birth_date INTO birth_date 
  FROM animals a 
  WHERE a.id = NEW.animal_id;
  
  -- Calculate age if birth date exists
  IF birth_date IS NOT NULL THEN
    NEW.edad_dias := NEW.fecha_defuncion - birth_date;
    NEW.edad_meses := FLOOR(NEW.edad_dias / 30.44);
  ELSE
    NEW.edad_dias := NULL;
    NEW.edad_meses := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_cabana_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- If cabaña_id is not set, assign the first available cabaña
  IF NEW.cabaña_id IS NULL THEN
    SELECT id INTO NEW.cabaña_id FROM cabañas LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_report_corrals_last_season(_user_id uuid)
RETURNS TABLE(corral_id uuid, name text, headcount bigint, pregnancy_rate numeric, calving_rate numeric, avg_adg_season numeric, avg_weight numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
BEGIN
  -- Get user's cabaña
  SELECT cabana_id INTO cabana_uuid FROM get_user_cabana_info(_user_id) LIMIT 1;
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
    FROM corrales c
    LEFT JOIN animals a ON c.id = a.corral_id 
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
  ORDER BY pregnancy_rate DESC, ca.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_report_reproduction_animals(_user_id uuid, filters_json jsonb)
RETURNS TABLE(animal_id uuid, tag text, name text, category text, corral_id uuid, corral_name text, exposures bigint, pregnancies bigint, pregnancy_rate numeric, calvings integer, live_calvings integer, calving_rate numeric, live_calving_rate numeric, open_days integer, is_repeater boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  SELECT cabana_id INTO cabana_uuid FROM get_user_cabana_info(_user_id) LIMIT 1;
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
    SELECT a.id,
           a.id_tag,
           a.name,
           a.corral_id,
           a.fecha_probable_parto,
           c.name as corral_name,
           categorize_animal(a.birth_date, a.sex) as animal_category
    FROM animals a
    LEFT JOIN corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = cabana_uuid
      AND a.sex = 'Hembra'
      AND (a.birth_date IS NULL OR EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 15) -- At least 15 months old
      AND (include_sold_dead OR a.status NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
      AND (category_filter IS NULL OR categorize_animal(a.birth_date, a.sex) = category_filter)
      AND (breed_filter IS NULL OR a.breed = breed_filter)
  ),
  services_data AS (
    SELECT DISTINCT
      unnest(ia.animales_ids) as animal_id,
      e.fecha as service_date
    FROM ia 
    JOIN eventos e ON ia.evento_id = e.id
    WHERE e.cabaña_id = cabana_uuid
      AND e.fecha BETWEEN date_from_filter AND date_to_filter
  ),
  preg_checks_data AS (
    SELECT DISTINCT
      (result_item->>'animal_id')::uuid as animal_id,
      sub.fecha as check_date,
      (result_item->>'resultado')::text as result
    FROM (
      SELECT 
        jsonb_array_elements(tactos.resultados) as result_item,
        e.fecha
      FROM tactos
      JOIN eventos e ON tactos.evento_id = e.id
      WHERE e.cabaña_id = cabana_uuid
        AND e.fecha BETWEEN date_from_filter AND date_to_filter
    ) sub
    WHERE (result_item->>'animal_id') IS NOT NULL
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
  ORDER BY pregnancy_rate DESC, ast.tag;
END;
$function$;