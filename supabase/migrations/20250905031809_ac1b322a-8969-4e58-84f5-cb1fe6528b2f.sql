-- Create a simplified reproductive metrics function to fix the data issue
DROP FUNCTION IF EXISTS public.rpc_reproductive_detailed_metrics(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.rpc_reproductive_detailed_metrics(_user_id uuid, filters_json jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(
   animal_id uuid, 
   tag text, 
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
 SET search_path TO 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
  include_sold_dead boolean := COALESCE((filters_json->>'include_sold_dead')::boolean, false);
  corral_ids_filter uuid[];
  performance_filter text := filters_json->>'performance';
BEGIN
  -- Get user's cabaña
  SELECT cabana_id INTO cabana_uuid FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;
  
  -- Safely parse corral_ids filter
  BEGIN
    corral_ids_filter := ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids'))::uuid[];
  EXCEPTION WHEN OTHERS THEN
    corral_ids_filter := NULL;
  END;
  
  RETURN QUERY
  SELECT 
    a.id as animal_id,
    COALESCE(a.id_tag, '') as tag,
    COALESCE(a.name, '') as name,
    CASE 
      WHEN a.birth_date IS NOT NULL 
      THEN (EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)))::integer
      ELSE 24 -- Default age for animals without birth date
    END as age_months,
    CASE 
      WHEN a.birth_date IS NULL THEN 'Sin fecha'
      WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) < 1 THEN 'Ternera'
      WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) < 2 THEN 'Vaquillona'
      ELSE 'Vaca'
    END as category,
    a.corral_id,
    COALESCE(c.name, 'Sin corral') as corral_name,
    COALESCE(a.esta_preñada, false) as is_pregnant,
    a.fecha_ultima_preñez as pregnancy_date,
    a.fecha_probable_parto as expected_calving_date,
    NULL::date as last_service_date, -- Simplified for now
    COALESCE(
      CASE 
        WHEN a.fecha_probable_parto IS NOT NULL AND a.fecha_probable_parto < CURRENT_DATE 
        THEN CURRENT_DATE - a.fecha_probable_parto
        ELSE 0
      END, 
      0
    ) as days_open,
    GREATEST(1, 
      CASE 
        WHEN a.birth_date IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) >= 1
        THEN CEIL(EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)))::INTEGER
        ELSE 1 
      END
    ) as reproductive_years,
    0 as total_offspring, -- Simplified for now
    0 as lifetime_services, -- Simplified for now
    CASE WHEN a.esta_preñada THEN 1 ELSE 0 END as lifetime_pregnancies,
    0 as lifetime_calvings, -- Simplified for now
    CASE 
      WHEN a.esta_preñada THEN 100.0
      ELSE 0.0
    END as individual_pregnancy_rate,
    0.0 as individual_calving_rate, -- Simplified for now
    CASE 
      WHEN a.esta_preñada THEN 'Excelente'
      ELSE 'Bajo'
    END as performance_level,
    0 as active_alerts,
    ARRAY[]::text[] as alert_types
  FROM public.animals a
  LEFT JOIN public.corrales c ON a.corral_id = c.id
  WHERE a.cabaña_id = cabana_uuid
    AND a.sex = 'Hembra'
    AND (
      a.birth_date IS NULL 
      OR (EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))) >= 15
    )
    AND (include_sold_dead OR COALESCE(a.status, 'activo') NOT IN ('vendido', 'muerto'))
    AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
    AND (performance_filter IS NULL OR 
      CASE 
        WHEN a.esta_preñada THEN 'Excelente'
        ELSE 'Bajo'
      END = performance_filter)
  ORDER BY a.esta_preñada DESC, a.id_tag;
END;
$function$;