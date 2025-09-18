-- Add fields to preñeces table for detailed loss tracking
ALTER TABLE public.preñeces 
ADD COLUMN IF NOT EXISTS tipo_perdida text,
ADD COLUMN IF NOT EXISTS causa_perdida text,
ADD COLUMN IF NOT EXISTS dias_gestacion_perdida integer,
ADD COLUMN IF NOT EXISTS fecha_perdida date,
ADD COLUMN IF NOT EXISTS observaciones_perdida text;

-- Create reproductive loss causes lookup table
CREATE TABLE IF NOT EXISTS public.reproductive_loss_causes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL, -- 'aborto_temprano', 'aborto_tardio', 'stillbirth', 'neonatal', 'no_detectada'
  causa text NOT NULL,
  descripcion text,
  categoria text, -- 'infeccioso', 'nutricional', 'genetico', 'manejo', 'ambiental', 'desconocido'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert common reproductive loss causes
INSERT INTO public.reproductive_loss_causes (tipo, causa, descripcion, categoria) VALUES
('aborto_temprano', 'Estrés', 'Aborto debido a estrés por manejo o ambiental', 'manejo'),
('aborto_temprano', 'Nutricional', 'Deficiencias nutricionales', 'nutricional'),
('aborto_temprano', 'Infeccioso', 'Enfermedades infecciosas', 'infeccioso'),
('aborto_tardio', 'Estrés severo', 'Estrés severo en gestación avanzada', 'manejo'),
('aborto_tardio', 'Infeccioso', 'Infecciones que causan aborto tardío', 'infeccioso'),
('aborto_tardio', 'Toxinas', 'Intoxicación por plantas o micotoxinas', 'ambiental'),
('stillbirth', 'Distocia', 'Problemas en el parto', 'manejo'),
('stillbirth', 'Genético', 'Defectos congénitos', 'genetico'),
('stillbirth', 'Infeccioso', 'Infecciones perinatales', 'infeccioso'),
('neonatal', 'Falta de calostro', 'No consumo adecuado de calostro', 'manejo'),
('neonatal', 'Hipotermia', 'Exposición a frío extremo', 'ambiental'),
('neonatal', 'Infeccioso', 'Infecciones neonatales', 'infeccioso'),
('no_detectada', 'Falso positivo', 'Error en detección de preñez', 'manejo'),
('no_detectada', 'Reabsorción embrionaria', 'Reabsorción temprana del embrión', 'desconocido');

-- RLS policies for reproductive_loss_causes
ALTER TABLE public.reproductive_loss_causes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reproductive loss causes" 
ON public.reproductive_loss_causes 
FOR SELECT USING (true);

CREATE POLICY "Admins can manage reproductive loss causes" 
ON public.reproductive_loss_causes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to calculate gestational days at loss
CREATE OR REPLACE FUNCTION calculate_gestational_days_at_loss()
RETURNS TRIGGER AS $$
BEGIN
  -- If marking a pregnancy as failed and we have both start and loss dates
  IF NEW.estado_final = 'fallida' AND NEW.fecha_perdida IS NOT NULL AND NEW.fecha_inicio IS NOT NULL THEN
    NEW.dias_gestacion_perdida := NEW.fecha_perdida - NEW.fecha_inicio;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic gestational days calculation
DROP TRIGGER IF EXISTS calculate_gestational_days_on_loss ON public.preñeces;
CREATE TRIGGER calculate_gestational_days_on_loss
  BEFORE UPDATE ON public.preñeces
  FOR EACH ROW
  EXECUTE FUNCTION calculate_gestational_days_at_loss();