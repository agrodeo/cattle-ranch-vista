-- Update the reproductive performance calculation function to include AI pregnancies
CREATE OR REPLACE FUNCTION public.calculate_reproductive_performance(animal_uuid uuid)
 RETURNS TABLE("porcentaje_preñez" numeric, porcentaje_paricion numeric, total_reproductive_years integer, confirmed_pregnancies integer, live_calves integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  birth_date_animal DATE;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  first_reproductive_year INTEGER;
BEGIN
  -- Get animal birth date
  SELECT birth_date INTO birth_date_animal 
  FROM animals 
  WHERE id = animal_uuid;
  
  IF birth_date_animal IS NULL THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::INTEGER, 0::INTEGER, 0::INTEGER;
    RETURN;
  END IF;
  
  -- Calculate first reproductive year (when animal turns 2)
  first_reproductive_year := EXTRACT(YEAR FROM birth_date_animal) + 2;
  
  -- If animal is not yet reproductive age, return zeros
  IF current_year < first_reproductive_year THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::INTEGER, 0::INTEGER, 0::INTEGER;
    RETURN;
  END IF;
  
  -- Calculate metrics combining reproductive_events and artificial_inseminations
  WITH all_pregnancies AS (
    -- Get pregnancies from reproductive_events
    SELECT 
      year,
      pregnancy_status,
      pregnancy_outcome
    FROM reproductive_events 
    WHERE animal_id = animal_uuid
      AND year >= first_reproductive_year
      AND year <= current_year
    
    UNION
    
    -- Get pregnancies from artificial_inseminations
    SELECT 
      EXTRACT(YEAR FROM insemination_date)::INTEGER as year,
      CASE WHEN is_pregnant = true THEN 'pregnant' ELSE NULL END as pregnancy_status,
      NULL as pregnancy_outcome
    FROM artificial_inseminations 
    WHERE female_id = animal_uuid
      AND EXTRACT(YEAR FROM insemination_date) >= first_reproductive_year
      AND EXTRACT(YEAR FROM insemination_date) <= current_year
      AND is_pregnant = true
  ),
  metrics AS (
    SELECT 
      (current_year - first_reproductive_year + 1) as reproductive_years,
      COUNT(DISTINCT CASE WHEN pregnancy_status = 'pregnant' THEN year END) as pregnancies,
      COUNT(CASE WHEN pregnancy_outcome = 'live_calf' THEN 1 END) as live_births
    FROM all_pregnancies
  )
  SELECT 
    CASE 
      WHEN reproductive_years > 0 THEN 
        ROUND((pregnancies::NUMERIC / reproductive_years::NUMERIC) * 100, 2)
      ELSE 0 
    END as porcentaje_preñez,
    CASE 
      WHEN pregnancies > 0 THEN 
        ROUND((live_births::NUMERIC / pregnancies::NUMERIC) * 100, 2)
      ELSE 0 
    END as porcentaje_paricion,
    reproductive_years,
    pregnancies,
    live_births
  FROM metrics
  INTO porcentaje_preñez, porcentaje_paricion, total_reproductive_years, confirmed_pregnancies, live_calves;
  
  RETURN NEXT;
END;
$function$;