-- Create storage bucket for animal documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('animal-documents', 'animal-documents', false);

-- Create animal_documents table for metadata
CREATE TABLE public.animal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'certificate', 'medical', 'photo', 'other'
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create corral_movements table for tracking animal movements
CREATE TABLE public.corral_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  corral_anterior_id UUID,
  corral_nuevo_id UUID,
  fecha_movimiento DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT,
  registrado_por UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for animal_documents
ALTER TABLE public.animal_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for animal_documents
CREATE POLICY "Users can view documents for their cabaña animals" 
ON public.animal_documents 
FOR SELECT 
USING (
  cabaña_id = get_current_user_cabana_id()
);

CREATE POLICY "Admins and employees can manage documents" 
ON public.animal_documents 
FOR ALL 
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) 
  AND cabaña_id = get_current_user_cabana_id()
)
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) 
  AND cabaña_id = get_current_user_cabana_id()
);

-- Enable RLS for corral_movements
ALTER TABLE public.corral_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for corral_movements
CREATE POLICY "Users can view movements for their cabaña" 
ON public.corral_movements 
FOR SELECT 
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage movements" 
ON public.corral_movements 
FOR ALL 
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) 
  AND cabaña_id = get_current_user_cabana_id()
)
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) 
  AND cabaña_id = get_current_user_cabana_id()
);

-- Storage policies for animal documents
CREATE POLICY "Users can view documents for their cabaña" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'animal-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT cabaña_id::text FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can upload documents for their cabaña" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'animal-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT cabaña_id::text FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update documents for their cabaña" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'animal-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT cabaña_id::text FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete documents for their cabaña" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'animal-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT cabaña_id::text FROM public.users WHERE id = auth.uid()
  )
);

-- Create function to automatically track corral movements when animals are moved
CREATE OR REPLACE FUNCTION public.track_corral_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if corral_id actually changed
  IF OLD.corral_id IS DISTINCT FROM NEW.corral_id THEN
    INSERT INTO public.corral_movements (
      animal_id,
      cabaña_id,
      corral_anterior_id,
      corral_nuevo_id,
      fecha_movimiento,
      registrado_por
    ) VALUES (
      NEW.id,
      NEW.cabaña_id,
      OLD.corral_id,
      NEW.corral_id,
      CURRENT_DATE,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically track movements
CREATE TRIGGER track_animal_corral_movements
  AFTER UPDATE OF corral_id ON public.animals
  FOR EACH ROW
  EXECUTE FUNCTION public.track_corral_movement();

-- Create initial movements for existing animals in corrales
INSERT INTO public.corral_movements (
  animal_id,
  cabaña_id,
  corral_anterior_id,
  corral_nuevo_id,
  fecha_movimiento,
  registrado_por
)
SELECT 
  a.id,
  a.cabaña_id,
  NULL, -- no previous corral for initial assignment
  a.corral_id,
  COALESCE(a.birth_date, CURRENT_DATE - INTERVAL '1 year'), -- use birth date or default
  (SELECT id FROM public.users WHERE cabaña_id = a.cabaña_id LIMIT 1) -- first user of the cabaña
FROM public.animals a
WHERE a.corral_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.corral_movements cm 
    WHERE cm.animal_id = a.id
  );

-- Add indexes for performance
CREATE INDEX idx_animal_documents_animal_id ON public.animal_documents(animal_id);
CREATE INDEX idx_animal_documents_cabana_id ON public.animal_documents(cabaña_id);
CREATE INDEX idx_corral_movements_animal_id ON public.corral_movements(animal_id);
CREATE INDEX idx_corral_movements_cabana_id ON public.corral_movements(cabaña_id);
CREATE INDEX idx_corral_movements_fecha ON public.corral_movements(fecha_movimiento);

-- Add updated_at trigger for animal_documents
CREATE TRIGGER update_animal_documents_updated_at
  BEFORE UPDATE ON public.animal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();