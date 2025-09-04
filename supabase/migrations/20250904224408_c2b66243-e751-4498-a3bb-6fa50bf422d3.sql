-- Fix search path security issues for the functions we just created

-- Fix calculate_age_months function with proper search path
DROP FUNCTION IF EXISTS public.calculate_age_months(date);

CREATE OR REPLACE FUNCTION public.calculate_age_months(birth_date date)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- CORRECT age calculation: years * 12 + months
  RETURN (EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date)))::INTEGER;
END;
$function$;

-- Fix categorize_animal function with proper search path
DROP FUNCTION IF EXISTS public.categorize_animal(date, text, date);

CREATE OR REPLACE FUNCTION public.categorize_animal(birth_date date, sex text, reference_date date DEFAULT NULL::date)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
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