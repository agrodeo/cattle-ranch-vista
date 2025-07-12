-- Create artificial_inseminations table for tracking AI services
CREATE TABLE public.artificial_inseminations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  female_id UUID NOT NULL REFERENCES animals(id),
  insemination_date DATE NOT NULL,
  bull_name TEXT NOT NULL, -- Bull name/ID (could be external or internal)
  bull_id UUID REFERENCES animals(id), -- Link to bull in system if exists
  is_pregnant BOOLEAN, -- NULL = pending, TRUE = pregnant, FALSE = not pregnant
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cabaña_id UUID NOT NULL,
  created_by UUID REFERENCES users(id)
);

-- Enable Row Level Security
ALTER TABLE public.artificial_inseminations ENABLE ROW LEVEL SECURITY;

-- Create policies for artificial_inseminations
CREATE POLICY "Users can manage AI records in their cabaña" 
ON public.artificial_inseminations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.cabaña_id = artificial_inseminations.cabaña_id
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_artificial_inseminations_updated_at
BEFORE UPDATE ON public.artificial_inseminations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate AI success rates
CREATE OR REPLACE FUNCTION public.calculate_ai_success_rate(
  filter_year INTEGER DEFAULT NULL,
  filter_corral_id UUID DEFAULT NULL,
  filter_bull_name TEXT DEFAULT NULL,
  filter_cabaña_id UUID DEFAULT NULL
)
RETURNS TABLE(
  total_inseminations INTEGER,
  total_pregnancies INTEGER,
  success_rate NUMERIC,
  pending_results INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  WITH ai_stats AS (
    SELECT 
      COUNT(*) as total_count,
      COUNT(CASE WHEN is_pregnant = TRUE THEN 1 END) as pregnant_count,
      COUNT(CASE WHEN is_pregnant IS NULL THEN 1 END) as pending_count
    FROM artificial_inseminations ai
    JOIN animals a ON ai.female_id = a.id
    WHERE (filter_cabaña_id IS NULL OR ai.cabaña_id = filter_cabaña_id)
      AND (filter_year IS NULL OR EXTRACT(YEAR FROM ai.insemination_date) = filter_year)
      AND (filter_corral_id IS NULL OR a.corral_id = filter_corral_id)
      AND (filter_bull_name IS NULL OR ai.bull_name ILIKE '%' || filter_bull_name || '%')
  )
  SELECT 
    total_count,
    pregnant_count,
    CASE 
      WHEN total_count > 0 THEN ROUND((pregnant_count::NUMERIC / total_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as rate,
    pending_count
  FROM ai_stats
  INTO total_inseminations, total_pregnancies, success_rate, pending_results;
  
  RETURN NEXT;
END;
$$;