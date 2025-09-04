-- Fix the reproductive performance calculation to handle younger pregnant animals
DROP FUNCTION IF EXISTS public.calculate_reproductive_performance(uuid);

CREATE OR REPLACE FUNCTION public.calculate_reproductive_performance(_animal_id uuid)
 RETURNS TABLE(pregnancy_percentage numeric, calving_percentage numeric, total_reproductive_years integer, confirmed_pregnancies integer, live_calves integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  animal_record RECORD;
  reproductive_years_count INTEGER := 0;
  actual_pregnancy_count INTEGER := 0;
  past_lost_pregnancy_count INTEGER := 0;
  offspring_count INTEGER := 0;
  live_calves_count INTEGER := 0;
  pregnancy_percentage_result NUMERIC := 0;
  calving_percentage_result NUMERIC := 0;
BEGIN
  -- Get animal details
  SELECT a.*, EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER as age_in_months
  INTO animal_record
  FROM public.animals a
  WHERE a.id = _animal_id;
  
  IF NOT FOUND OR animal_record.sex != 'Hembra' THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0::integer, 0::integer, 0::integer;
    RETURN;
  END IF;
  
  -- Count actual pregnancies (currently pregnant)
  IF animal_record.esta_preñada = true THEN
    actual_pregnancy_count := 1;
  ELSE
    actual_pregnancy_count := 0;
  END IF;
  
  -- Count past lost pregnancies from preñeces table (failed/aborted pregnancies)
  SELECT COUNT(*)::INTEGER INTO past_lost_pregnancy_count
  FROM public.preñeces p
  WHERE p.animal_id = _animal_id 
    AND p.estado IN ('fallida', 'abortada');
  
  -- Count offspring where this animal is the mother
  SELECT COUNT(*)::INTEGER INTO offspring_count
  FROM public.animals a
  WHERE a.mother_id = _animal_id;
  
  -- Count live calves (offspring that are not dead)
  SELECT COUNT(*)::INTEGER INTO live_calves_count
  FROM public.animals a
  WHERE a.mother_id = _animal_id
    AND (a.status IS NULL OR a.status != 'muerto');
  
  -- Calculate reproductive years - If animal has been pregnant or has offspring, count as reproductive
  -- Otherwise use age-based calculation (minimum 15 months instead of 18)
  IF actual_pregnancy_count > 0 OR past_lost_pregnancy_count > 0 OR offspring_count > 0 THEN
    -- Animal has reproductive activity - calculate years since first reproductive activity or 15 months age
    IF animal_record.age_in_months >= 15 THEN
      reproductive_years_count := GREATEST(1, FLOOR((animal_record.age_in_months - 15) / 12.0)::INTEGER + 1);
    ELSE
      -- Very young but reproductive - count as 1 year minimum
      reproductive_years_count := 1;
    END IF;
  ELSIF animal_record.age_in_months >= 15 THEN
    -- Animal is old enough to be reproductive but has no activity
    reproductive_years_count := GREATEST(1, FLOOR((animal_record.age_in_months - 15) / 12.0)::INTEGER + 1);
  ELSE
    -- Animal is too young and has no reproductive activity
    reproductive_years_count := 0;
  END IF;
  
  -- Calculate pregnancy percentage: (actual pregnancy + past lost pregnancy + offspring) / reproductive years × 100
  IF reproductive_years_count > 0 THEN
    pregnancy_percentage_result := ROUND(((actual_pregnancy_count + past_lost_pregnancy_count + offspring_count)::NUMERIC / reproductive_years_count::NUMERIC) * 100, 1);
  END IF;
  
  -- Calculate calving percentage: live calves / total pregnancies × 100
  IF (actual_pregnancy_count + past_lost_pregnancy_count + offspring_count) > 0 THEN
    calving_percentage_result := ROUND((live_calves_count::NUMERIC / (actual_pregnancy_count + past_lost_pregnancy_count + offspring_count)::NUMERIC) * 100, 1);
  END IF;
  
  RETURN QUERY SELECT 
    pregnancy_percentage_result,
    calving_percentage_result,
    reproductive_years_count,
    actual_pregnancy_count + past_lost_pregnancy_count + offspring_count,
    live_calves_count;
END;
$function$;