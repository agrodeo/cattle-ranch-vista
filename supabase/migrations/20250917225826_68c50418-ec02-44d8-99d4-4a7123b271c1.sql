-- Fix search path for the function I just created
CREATE OR REPLACE FUNCTION public.calculate_individual_reproductive_percentages(_animal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Update the get_enhanced_reproductive_metrics function to use the new calculation method
DROP FUNCTION IF EXISTS public.get_enhanced_reproductive_metrics(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.get_enhanced_reproductive_metrics(_cabana_id uuid, _filters jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(
  animal_id uuid,
  id_tag text,
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
  reproductive_years numeric,
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
AS $$
DECLARE
  include_sold_dead boolean := COALESCE((_filters->>'include_sold_dead')::boolean, false);
  corral_ids_filter uuid[] := ARRAY(SELECT jsonb_array_elements_text(_filters->'corral_ids'))::uuid[];
BEGIN
  RETURN QUERY
  WITH eligible_females AS (
    SELECT 
      a.id,
      a.id_tag,
      a.name,
      a.birth_date,
      a.corral_id,
      c.name as corral_name,
      a.esta_preñada,
      a.fecha_ultima_preñez,
      a.fecha_probable_parto,
      -- Calculate age in months
      CASE 
        WHEN a.birth_date IS NOT NULL THEN
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date))::integer * 12 + 
          EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::integer
        ELSE 24 -- Default for animals without birth date
      END as calculated_age_months
    FROM animals a
    LEFT JOIN corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = _cabana_id
      AND a.sex = 'Hembra'
      AND (include_sold_dead OR a.status NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
  ),
  reproductive_females AS (
    SELECT *
    FROM eligible_females
    WHERE calculated_age_months >= 15 -- Only females 15+ months
  ),
  reproductive_data AS (
    SELECT 
      rf.*,
      -- Calculate reproductive years
      GREATEST(1, CEIL((rf.calculated_age_months - 15) / 12.0)) as repro_years,
      -- Count total pregnancies
      COALESCE((
        SELECT COUNT(*)
        FROM preñeces p
        WHERE p.animal_id = rf.id
      ), 0) as total_pregnancies,
      -- Count successful calvings (live offspring)
      COALESCE((
        SELECT COUNT(*)
        FROM animals offspring
        WHERE offspring.mother_id = rf.id
          AND offspring.status NOT IN ('vendido', 'muerto')
      ), 0) as successful_calvings,
      -- Count all offspring
      COALESCE((
        SELECT COUNT(*)
        FROM animals offspring
        WHERE offspring.mother_id = rf.id
      ), 0) as total_children,
      -- Count services (simplified - from IA records)
      COALESCE((
        SELECT COUNT(DISTINCT ia.id)
        FROM ia
        JOIN eventos e ON ia.evento_id = e.id
        WHERE e.cabaña_id = _cabana_id
          AND rf.id = ANY(ia.animales_ids)
      ), 0) as total_services,
      -- Count alerts
      COALESCE((
        SELECT COUNT(*)
        FROM reproductive_alerts ra
        WHERE ra.animal_id = rf.id 
          AND ra.status = 'pending'
      ), 0) as alert_count,
      -- Get alert types
      COALESCE((
        SELECT array_agg(DISTINCT ra.alert_type)
        FROM reproductive_alerts ra
        WHERE ra.animal_id = rf.id 
          AND ra.status = 'pending'
      ), ARRAY[]::text[]) as alert_types_array
    FROM reproductive_females rf
  )
  SELECT 
    rd.id,
    rd.id_tag,
    rd.name,
    rd.calculated_age_months,
    CASE 
      WHEN rd.calculated_age_months < 12 THEN 'Ternera'
      WHEN rd.calculated_age_months < 24 THEN 'Vaquillona'
      ELSE 'Vaca'
    END as category,
    rd.corral_id,
    rd.corral_name,
    COALESCE(rd.esta_preñada, false),
    rd.fecha_ultima_preñez,
    rd.fecha_probable_parto,
    NULL::date as last_service_date, -- TODO: Get from eventos/ia tables
    0 as days_open, -- TODO: Calculate based on last calving and service dates
    rd.repro_years,
    rd.total_children::integer,
    rd.total_services::integer,
    rd.total_pregnancies::integer,
    rd.successful_calvings::integer,
    -- NEW FORMULA: Pregnancy rate = (total pregnancies / reproductive years) × 100
    CASE 
      WHEN rd.repro_years > 0 
      THEN ROUND((rd.total_pregnancies::numeric / rd.repro_years) * 100, 1)
      ELSE 0
    END as individual_pregnancy_rate,
    -- NEW FORMULA: Calving rate = (successful calvings / total pregnancies) × 100
    CASE 
      WHEN rd.total_pregnancies > 0 
      THEN ROUND((rd.successful_calvings::numeric / rd.total_pregnancies) * 100, 1)
      ELSE 0
    END as individual_calving_rate,
    -- Performance level based on pregnancy rate
    CASE 
      WHEN rd.repro_years = 0 THEN 'Sin actividad reproductiva'
      WHEN rd.total_pregnancies = 0 THEN 'Sin preñeces'
      WHEN ROUND((rd.total_pregnancies::numeric / rd.repro_years) * 100, 1) >= 80 THEN 'Excelente'
      WHEN ROUND((rd.total_pregnancies::numeric / rd.repro_years) * 100, 1) >= 60 THEN 'Bueno'
      WHEN ROUND((rd.total_pregnancies::numeric / rd.repro_years) * 100, 1) >= 40 THEN 'Regular'
      ELSE 'Bajo'
    END as performance_level,
    rd.alert_count::integer,
    rd.alert_types_array
  FROM reproductive_data rd
  ORDER BY rd.id_tag;
END;
$$;