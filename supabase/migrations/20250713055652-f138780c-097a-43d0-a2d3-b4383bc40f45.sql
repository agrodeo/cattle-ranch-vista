-- Create bulls table for detailed bull information
CREATE TABLE public.bulls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  breed TEXT,
  registration_level TEXT,
  official_registration_number TEXT,
  insemination_center TEXT,
  nationality TEXT,
  owner TEXT,
  genetic_health_observations TEXT,
  color TEXT,
  is_genotyped BOOLEAN DEFAULT false,
  internal_code TEXT,
  cabaña_id UUID REFERENCES public.cabañas(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.bulls ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage bulls in their cabaña
CREATE POLICY "Users can manage bulls in their cabaña" 
ON public.bulls 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.cabaña_id = bulls.cabaña_id
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bulls_updated_at
BEFORE UPDATE ON public.bulls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();