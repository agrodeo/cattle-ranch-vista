-- Drop the existing function and recreate with correct formula
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
  confirmed_pregnancies_count INTEGER := 0;
  pending_pregnancies_count INTEGER := 0;
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
  
  -- Calculate reproductive years (from 18 months old)
  IF animal_record.age_in_months >= 18 THEN
    reproductive_years_count := GREATEST(1, FLOOR((animal_record.age_in_months - 18) / 12.0)::INTEGER + 1);
  END IF;
  
  -- Count confirmed pregnancies from preñeces table
  SELECT COUNT(*)::INTEGER INTO confirmed_pregnancies_count
  FROM public.preñeces p
  WHERE p.animal_id = _animal_id 
    AND p.estado = 'confirmada';
  
  -- Count pending pregnancies from preñeces table
  SELECT COUNT(*)::INTEGER INTO pending_pregnancies_count
  FROM public.preñeces p
  WHERE p.animal_id = _animal_id 
    AND p.estado = 'pendiente';
  
  -- Count offspring where this animal is the mother
  SELECT COUNT(*)::INTEGER INTO offspring_count
  FROM public.animals a
  WHERE a.mother_id = _animal_id;
  
  -- Count live calves (offspring that are not dead)
  SELECT COUNT(*)::INTEGER INTO live_calves_count
  FROM public.animals a
  WHERE a.mother_id = _animal_id
    AND (a.status IS NULL OR a.status != 'muerto');
  
  -- Calculate pregnancy percentage: (confirmed pregnancies + pending pregnancies + offspring) / reproductive years × 100
  IF reproductive_years_count > 0 THEN
    pregnancy_percentage_result := ROUND(((confirmed_pregnancies_count + pending_pregnancies_count + offspring_count)::NUMERIC / reproductive_years_count::NUMERIC) * 100, 1);
  END IF;
  
  -- Calculate calving percentage: live calves / total pregnancies × 100
  IF (confirmed_pregnancies_count + pending_pregnancies_count + offspring_count) > 0 THEN
    calving_percentage_result := ROUND((live_calves_count::NUMERIC / (confirmed_pregnancies_count + pending_pregnancies_count + offspring_count)::NUMERIC) * 100, 1);
  END IF;
  
  RETURN QUERY SELECT 
    pregnancy_percentage_result,
    calving_percentage_result,
    reproductive_years_count,
    confirmed_pregnancies_count + pending_pregnancies_count + offspring_count,
    live_calves_count;
END;
$function$;