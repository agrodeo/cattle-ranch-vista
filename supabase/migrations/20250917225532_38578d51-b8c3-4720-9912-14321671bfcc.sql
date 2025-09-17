-- Drop and recreate the function with updated logic
DROP FUNCTION IF EXISTS public.calculate_individual_reproductive_percentages(uuid);

-- Create the updated function with correct formulas
CREATE OR REPLACE FUNCTION public.calculate_individual_reproductive_percentages(_animal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  animal_record RECORD;
  total_pregnancies INTEGER := 0;
  successful_calvings INTEGER := 0;
  reproductive_years NUMERIC := 0;
  pregnancy_percentage NUMERIC := 0;
  calving_percentage NUMERIC := 0;
  age_months INTEGER;
BEGIN
  -- Get animal data
  SELECT a.birth_date, a.sex
  INTO animal_record
  FROM animals a
  WHERE a.id = _animal_id;
  
  IF NOT FOUND OR animal_record.sex != 'Hembra' THEN
    RETURN jsonb_build_object('error', 'Animal not found or not female');
  END IF;
  
  -- Calculate age and reproductive years
  IF animal_record.birth_date IS NOT NULL THEN
    age_months := EXTRACT(YEAR FROM AGE(CURRENT_DATE, animal_record.birth_date))::integer * 12 + 
                 EXTRACT(MONTH FROM AGE(CURRENT_DATE, animal_record.birth_date))::integer;
  ELSE
    age_months := 24; -- Default for animals without birth date
  END IF;
  
  -- Reproductive years = years since 15 months of age (minimum 1 if animal is reproductive age)
  IF age_months >= 15 THEN
    reproductive_years := GREATEST(1, CEIL((age_months - 15) / 12.0));
  ELSE
    reproductive_years := 0;
  END IF;
  
  -- Count total pregnancies (all pregnancies regardless of outcome)
  SELECT COUNT(*)
  INTO total_pregnancies
  FROM preñeces p
  WHERE p.animal_id = _animal_id;
  
  -- Count successful calvings (live offspring)
  SELECT COUNT(*)
  INTO successful_calvings
  FROM animals offspring
  WHERE offspring.mother_id = _animal_id
    AND offspring.status NOT IN ('vendido', 'muerto');
  
  -- FORMULA 1: Pregnancy percentage = (total pregnancies / reproductive years) × 100
  IF reproductive_years > 0 THEN
    pregnancy_percentage := ROUND((total_pregnancies::NUMERIC / reproductive_years) * 100, 1);
  ELSE
    pregnancy_percentage := 0;
  END IF;
  
  -- FORMULA 2: Calving percentage = (successful calvings / total pregnancies) × 100
  IF total_pregnancies > 0 THEN
    calving_percentage := ROUND((successful_calvings::NUMERIC / total_pregnancies) * 100, 1);
  ELSE
    calving_percentage := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'pregnancy_percentage', pregnancy_percentage,
    'calving_percentage', calving_percentage,
    'total_pregnancies', total_pregnancies,
    'successful_calvings', successful_calvings,
    'reproductive_years', reproductive_years,
    'age_months', age_months,
    'confirmed_pregnancies', total_pregnancies,
    'live_calves', successful_calvings,
    'total_reproductive_years', reproductive_years
  );
END;
$$;