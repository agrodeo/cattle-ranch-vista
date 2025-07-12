-- Create reproductive_events table for detailed tracking
CREATE TABLE public.reproductive_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  year INTEGER NOT NULL,
  pregnancy_status TEXT CHECK (pregnancy_status IN ('pregnant', 'not_pregnant', 'unknown')),
  pregnancy_outcome TEXT CHECK (pregnancy_outcome IN ('live_calf', 'stillborn', 'calf_died_shortly', 'lost_pregnancy')),
  calving_date DATE,
  linked_calf_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cabaña_id UUID NOT NULL,
  UNIQUE(animal_id, year)
);

-- Enable Row Level Security
ALTER TABLE public.reproductive_events ENABLE ROW LEVEL SECURITY;

-- Create policies for reproductive_events
CREATE POLICY "Users can manage reproductive events in their cabaña" 
ON public.reproductive_events 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.cabaña_id = reproductive_events.cabaña_id
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_reproductive_events_updated_at
BEFORE UPDATE ON public.reproductive_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate reproductive performance
CREATE OR REPLACE FUNCTION public.calculate_reproductive_performance(animal_uuid UUID)
RETURNS TABLE(
  porcentaje_preñez NUMERIC,
  porcentaje_paricion NUMERIC,
  total_reproductive_years INTEGER,
  confirmed_pregnancies INTEGER,
  live_calves INTEGER
) LANGUAGE plpgsql AS $$
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
  
  -- Calculate metrics
  WITH metrics AS (
    SELECT 
      (current_year - first_reproductive_year + 1) as reproductive_years,
      COUNT(CASE WHEN pregnancy_status = 'pregnant' THEN 1 END) as pregnancies,
      COUNT(CASE WHEN pregnancy_outcome = 'live_calf' THEN 1 END) as live_births
    FROM reproductive_events 
    WHERE animal_id = animal_uuid
      AND year >= first_reproductive_year
      AND year <= current_year
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
$$;