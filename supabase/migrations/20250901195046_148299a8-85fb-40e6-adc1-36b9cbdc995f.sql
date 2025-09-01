-- Let's test the current RPC function with debug
DO $$
DECLARE
  animal_record RECORD;
  scheme_record RECORD;
  last_vaccination_record RECORD;
  age_months INTEGER;
BEGIN
  -- Get animal details for debugging
  SELECT a.*, EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER as age_in_months
  INTO animal_record
  FROM public.animals a
  WHERE a.id = '3225b823-aa59-416b-9998-6eff77696625';
  
  age_months := animal_record.age_in_months;
  
  RAISE NOTICE 'Animal: %, Age: % months, Sex: %', animal_record.name, age_months, animal_record.sex;
  
  -- Check schemes that apply
  FOR scheme_record IN
    SELECT vs.*
    FROM public.vaccination_schemes vs
    WHERE vs.country = 'Argentina'
      AND vs.is_active = true
      AND (vs.sex_restriction IS NULL OR vs.sex_restriction = animal_record.sex)
      AND (vs.min_age_months IS NULL OR age_months >= vs.min_age_months)
      AND (vs.max_age_months IS NULL OR age_months <= vs.max_age_months)
    ORDER BY vs.is_mandatory DESC, vs.name
  LOOP
    RAISE NOTICE 'Applicable scheme: %, Min age: %, Vaccine type: %', 
      scheme_record.name, scheme_record.min_age_months, scheme_record.vaccine_type;
      
    -- Check in vacunas_historial
    SELECT vh.fecha
    INTO last_vaccination_record
    FROM public.vacunas_historial vh
    WHERE vh.animal_id = animal_record.id
      AND UPPER(vh.vacuna) LIKE '%' || UPPER(scheme_record.vaccine_type) || '%'
    ORDER BY vh.fecha DESC
    LIMIT 1;
    
    IF last_vaccination_record IS NOT NULL THEN
      RAISE NOTICE 'Found vaccination in vacunas_historial: %', last_vaccination_record.fecha;
    ELSE
      RAISE NOTICE 'No vaccination found for vaccine type: %', scheme_record.vaccine_type;
    END IF;
  END LOOP;
END $$;