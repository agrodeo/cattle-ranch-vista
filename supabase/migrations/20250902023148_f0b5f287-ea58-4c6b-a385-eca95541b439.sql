-- Drop and recreate the reproductive performance function with correct return type
DROP FUNCTION IF EXISTS public.calculate_reproductive_performance(uuid);

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