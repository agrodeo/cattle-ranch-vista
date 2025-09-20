-- Create vaccination requirements table for each cabaña
CREATE TABLE public.cabaña_vaccination_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cabaña_id UUID NOT NULL,
  vaccine_name TEXT NOT NULL,
  vaccine_type TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  sex_restriction TEXT CHECK (sex_restriction IN ('Macho', 'Hembra', NULL)), -- NULL means both sexes
  min_age_months INTEGER, -- Minimum age in months
  max_age_months INTEGER, -- Maximum age in months (optional)
  frequency_months INTEGER, -- How often to repeat (NULL for single dose)
  country TEXT NOT NULL DEFAULT 'Argentina',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_cabaña_vaccination_requirements_cabaña FOREIGN KEY (cabaña_id) REFERENCES public.cabañas(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.cabaña_vaccination_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage vaccination requirements for their cabaña"
ON public.cabaña_vaccination_requirements
FOR ALL
USING (cabaña_id = get_current_user_cabana_id())
WITH CHECK (cabaña_id = get_current_user_cabana_id());

-- Create indexes for better performance
CREATE INDEX idx_cabaña_vaccination_requirements_cabaña_id ON public.cabaña_vaccination_requirements(cabaña_id);
CREATE INDEX idx_cabaña_vaccination_requirements_active ON public.cabaña_vaccination_requirements(cabaña_id, is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_cabaña_vaccination_requirements_updated_at
BEFORE UPDATE ON public.cabaña_vaccination_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get vaccination status for an animal
CREATE OR REPLACE FUNCTION public.get_animal_vaccination_status(_animal_id UUID, _cabaña_id UUID)
RETURNS TABLE(
  requirement_id UUID,
  vaccine_name TEXT,
  vaccine_type TEXT,
  is_mandatory BOOLEAN,
  status TEXT, -- 'compliant', 'overdue', 'upcoming', 'not_applicable'
  last_vaccination_date DATE,
  next_due_date DATE,
  days_overdue INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  animal_record RECORD;
  req_record RECORD;
  last_vaccine_date DATE;
  next_due DATE;
  animal_age_months INTEGER;
  days_overdue_calc INTEGER;
  vaccine_status TEXT;
BEGIN
  -- Get animal details
  SELECT a.*, EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER as age_in_months
  INTO animal_record
  FROM public.animals a
  WHERE a.id = _animal_id AND a.cabaña_id = _cabaña_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  animal_age_months := COALESCE(animal_record.age_in_months, 0);
  
  -- Loop through vaccination requirements for this cabaña
  FOR req_record IN
    SELECT *
    FROM public.cabaña_vaccination_requirements cvr
    WHERE cvr.cabaña_id = _cabaña_id
      AND cvr.is_active = true
      AND (cvr.sex_restriction IS NULL OR cvr.sex_restriction = animal_record.sex)
    ORDER BY cvr.is_mandatory DESC, cvr.vaccine_name
  LOOP
    -- Check if animal meets age requirements
    IF req_record.min_age_months IS NOT NULL AND animal_age_months < req_record.min_age_months THEN
      vaccine_status := 'not_applicable';
      last_vaccine_date := NULL;
      next_due := NULL;
      days_overdue_calc := NULL;
    ELSIF req_record.max_age_months IS NOT NULL AND animal_age_months > req_record.max_age_months THEN
      vaccine_status := 'not_applicable';
      last_vaccine_date := NULL;
      next_due := NULL;
      days_overdue_calc := NULL;
    ELSE
      -- Check vaccination history
      SELECT vh.fecha
      INTO last_vaccine_date
      FROM public.vacunas_historial vh
      WHERE vh.animal_id = _animal_id
        AND vh.cabaña_id = _cabaña_id
        AND (
          UPPER(vh.vacuna) LIKE '%' || UPPER(req_record.vaccine_name) || '%'
          OR UPPER(vh.vacuna) LIKE '%' || UPPER(req_record.vaccine_type) || '%'
        )
      ORDER BY vh.fecha DESC
      LIMIT 1;
      
      IF last_vaccine_date IS NOT NULL THEN
        -- Calculate next due date
        IF req_record.frequency_months IS NOT NULL THEN
          next_due := last_vaccine_date + (req_record.frequency_months || ' months')::INTERVAL;
          days_overdue_calc := CURRENT_DATE - next_due;
          
          IF days_overdue_calc > 0 THEN
            vaccine_status := 'overdue';
          ELSIF days_overdue_calc > -30 THEN -- Due within 30 days
            vaccine_status := 'upcoming';
          ELSE
            vaccine_status := 'compliant';
          END IF;
        ELSE
          -- Single dose vaccine
          vaccine_status := 'compliant';
          next_due := NULL;
          days_overdue_calc := NULL;
        END IF;
      ELSE
        -- No vaccination found
        IF req_record.min_age_months IS NOT NULL AND animal_age_months >= req_record.min_age_months THEN
          vaccine_status := 'overdue';
          next_due := CURRENT_DATE;
          days_overdue_calc := GREATEST(0, animal_age_months - req_record.min_age_months) * 30; -- Approximate days
        ELSE
          vaccine_status := 'upcoming';
          next_due := animal_record.birth_date + (req_record.min_age_months || ' months')::INTERVAL;
          days_overdue_calc := NULL;
        END IF;
      END IF;
    END IF;
    
    -- Return the result
    RETURN QUERY SELECT
      req_record.id,
      req_record.vaccine_name,
      req_record.vaccine_type,
      req_record.is_mandatory,
      vaccine_status,
      last_vaccine_date,
      next_due,
      days_overdue_calc;
  END LOOP;
END;
$$;

-- Insert default vaccination requirements for Argentina
INSERT INTO public.cabaña_vaccination_requirements (cabaña_id, vaccine_name, vaccine_type, description, is_mandatory, sex_restriction, min_age_months, frequency_months, country)
SELECT 
  c.id,
  'Aftosa',
  'Viral',
  'Vacuna contra Fiebre Aftosa',
  true,
  NULL,
  6,
  6,
  'Argentina'
FROM public.cabañas c
ON CONFLICT DO NOTHING;

INSERT INTO public.cabaña_vaccination_requirements (cabaña_id, vaccine_name, vaccine_type, description, is_mandatory, sex_restriction, min_age_months, frequency_months, country)
SELECT 
  c.id,
  'Brucelosis',
  'Bacterial',
  'Vacuna contra Brucelosis',
  true,
  'Hembra',
  3,
  NULL, -- Single dose
  'Argentina'
FROM public.cabañas c
ON CONFLICT DO NOTHING;