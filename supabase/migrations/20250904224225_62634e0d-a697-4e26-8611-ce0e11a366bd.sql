-- Fix age calculation in all database functions
-- The issue: EXTRACT(MONTH FROM AGE(...)) only gets month component, not total months
-- The fix: EXTRACT(YEAR FROM AGE(...)) * 12 + EXTRACT(MONTH FROM AGE(...))

-- Fix calculate_reproductive_performance function
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
  -- Get animal details with CORRECT age calculation
  SELECT a.*, 
    (EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)))::INTEGER as age_in_months
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
  -- Use 18 months as minimum reproductive age (not 15)
  IF actual_pregnancy_count > 0 OR past_lost_pregnancy_count > 0 OR offspring_count > 0 THEN
    -- Animal has reproductive activity - calculate years since first reproductive activity or 18 months age
    IF animal_record.age_in_months >= 18 THEN
      reproductive_years_count := GREATEST(1, FLOOR((animal_record.age_in_months - 18) / 12.0)::INTEGER + 1);
    ELSE
      -- Very young but reproductive - count as 1 year minimum
      reproductive_years_count := 1;
    END IF;
  ELSIF animal_record.age_in_months >= 18 THEN
    -- Animal is old enough to be reproductive but has no activity
    reproductive_years_count := GREATEST(1, FLOOR((animal_record.age_in_months - 18) / 12.0)::INTEGER + 1);
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

-- Fix calculate_age_months function if it exists
DROP FUNCTION IF EXISTS public.calculate_age_months(date);

CREATE OR REPLACE FUNCTION public.calculate_age_months(birth_date date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- CORRECT age calculation: years * 12 + months
  RETURN (EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date)))::INTEGER;
END;
$function$;

-- Fix categorize_animal function to use correct age calculation
DROP FUNCTION IF EXISTS public.categorize_animal(date, text, date);

CREATE OR REPLACE FUNCTION public.categorize_animal(birth_date date, sex text, reference_date date DEFAULT NULL::date)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  check_date DATE;
  age_months INTEGER;
BEGIN
  -- Use current date if not provided
  check_date := COALESCE(reference_date, CURRENT_DATE);
  
  IF birth_date IS NULL OR sex IS NULL THEN
    RETURN 'Desconocido';
  END IF;
  
  -- CORRECT age calculation: years * 12 + months
  age_months := (EXTRACT(YEAR FROM AGE(check_date, birth_date)) * 12 + EXTRACT(MONTH FROM AGE(check_date, birth_date)))::INTEGER;
  
  CASE 
    WHEN sex = 'Macho' THEN
      CASE 
        WHEN age_months < 12 THEN RETURN 'Ternero';
        WHEN age_months < 24 THEN RETURN 'Torete';
        ELSE RETURN 'Toro';
      END CASE;
    WHEN sex = 'Hembra' THEN
      CASE 
        WHEN age_months < 12 THEN RETURN 'Ternera';
        WHEN age_months < 24 THEN RETURN 'Vaquillona';
        ELSE RETURN 'Vaca';
      END CASE;
    ELSE RETURN 'Desconocido';
  END CASE;
END;
$function$;