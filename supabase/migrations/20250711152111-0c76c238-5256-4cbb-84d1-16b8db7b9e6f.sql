-- Create corrales table
CREATE TABLE public.corrales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hectareas NUMERIC,
  user_id UUID REFERENCES auth.users(id),
  cabaña_id UUID REFERENCES public.cabañas(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add corral_id to animals table
ALTER TABLE public.animals 
ADD COLUMN corral_id UUID REFERENCES public.corrales(id);

-- Enable RLS for corrales
ALTER TABLE public.corrales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for corrales
CREATE POLICY "Users can manage corrales in their cabaña" 
ON public.corrales 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.cabaña_id = corrales.cabaña_id
  )
);

-- Create function to update timestamps
CREATE TRIGGER update_corrales_updated_at
BEFORE UPDATE ON public.corrales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();