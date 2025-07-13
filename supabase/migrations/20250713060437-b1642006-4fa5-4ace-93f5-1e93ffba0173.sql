-- Add genetic fields to bulls table
ALTER TABLE public.bulls ADD COLUMN horn_status TEXT; -- For Braford: astado, mocho, mocho_homocigota
ALTER TABLE public.bulls ADD COLUMN coat_color TEXT; -- For Brangus/Angus: negro, colorado, negro_homocigota, colorado_homocigota
ALTER TABLE public.bulls ADD COLUMN scrotal_circumference NUMERIC; -- CE
ALTER TABLE public.bulls ADD COLUMN birth_weight NUMERIC; -- Peso al nacer
ALTER TABLE public.bulls ADD COLUMN weaning_weight NUMERIC; -- Peso al destete
ALTER TABLE public.bulls ADD COLUMN final_weight NUMERIC; -- Peso final

-- Update animals table to ensure we have proper status and birth_date for validations
-- Add computed column for age validation if not exists
CREATE OR REPLACE FUNCTION public.calculate_age_months(birth_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date));
END;
$$;