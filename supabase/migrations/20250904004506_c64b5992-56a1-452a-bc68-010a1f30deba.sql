-- Create a new function to show all reproductive females including currently pregnant ones
CREATE OR REPLACE FUNCTION public.rpc_report_reproductive_females(_user_id uuid, filters_json jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(
   animal_id uuid, 
   tag text, 
   name text, 
   category text, 
   corral_id uuid, 
   corral_name text, 
   is_pregnant boolean,
   pregnancy_date date,
   expected_calving_date date,
   age_months integer,
   last_service_date date,
   services_count integer,
   pregnancy_checks_count integer
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
  include_sold_dead boolean := COALESCE((filters_json->>'include_sold_dead')::boolean, false);
  corral_ids_filter uuid[] := ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids'))::uuid[];
  category_filter text := filters_json->>'category';
  breed_filter text := filters_json->>'breed';
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
             WHEN a.birth_date IS NOT NULL AND a.birth_date <= CURRENT_DATE 
             THEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::integer
             ELSE NULL 
           END as age_in_months
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
      AND (category_filter IS NULL OR public.categorize_animal(a.birth_date, a.sex) = category_filter)
      AND (breed_filter IS NULL OR a.breed = breed_filter)
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
  pregnancy_checks_data AS (
    SELECT 
      (result_item->>'animal_id')::uuid as animal_id,
      COUNT(*) as check_count
    FROM (
      SELECT 
        jsonb_array_elements(tactos.resultados) as result_item
      FROM public.tactos
      JOIN public.eventos e ON tactos.evento_id = e.id
      WHERE e.cabaña_id = cabana_uuid
    ) sub
    WHERE (result_item->>'animal_id') IS NOT NULL
    GROUP BY (result_item->>'animal_id')::uuid
  )
  SELECT 
    ef.id as animal_id,
    ef.id_tag as tag,
    ef.name,
    ef.animal_category as category,
    ef.corral_id,
    ef.corral_name,
    COALESCE(ef.esta_preñada, false) as is_pregnant,
    ef.fecha_ultima_preñez as pregnancy_date,
    ef.fecha_probable_parto as expected_calving_date,
    ef.age_in_months,
    sd.last_service_date,
    COALESCE(sd.service_count, 0)::integer as services_count,
    COALESCE(pcd.check_count, 0)::integer as pregnancy_checks_count
  FROM eligible_females ef
  LEFT JOIN services_data sd ON ef.id = sd.animal_id
  LEFT JOIN pregnancy_checks_data pcd ON ef.id = pcd.animal_id
  ORDER BY ef.esta_preñada DESC NULLS LAST, ef.id_tag;
END;
$function$;