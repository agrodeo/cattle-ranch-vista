-- Add missing columns to animals table for comprehensive animal management
ALTER TABLE public.animals 
ADD COLUMN peso_final NUMERIC,
ADD COLUMN circunferencia_escrotal NUMERIC,
ADD COLUMN tipo_parto TEXT CHECK (tipo_parto IN ('Simple', 'Gemelar', 'Dificultoso', 'Natural')),
ADD COLUMN fecha_destete DATE,
ADD COLUMN peso_destete NUMERIC,
ADD COLUMN fecha_servicio DATE,
ADD COLUMN toro_servicio_id UUID,
ADD COLUMN tipo_servicio TEXT CHECK (tipo_servicio IN ('Natural', 'I.A.', 'Transferencia Embrionaria')),
ADD COLUMN resultado_preñez TEXT CHECK (resultado_preñez IN ('Positiva', 'Negativa', 'Vacía', 'Muerta')),
ADD COLUMN fecha_muerte DATE;

-- Add foreign key constraint for toro_servicio_id
ALTER TABLE public.animals 
ADD CONSTRAINT fk_toro_servicio 
FOREIGN KEY (toro_servicio_id) REFERENCES public.animals(id);

-- Add indexes for better performance on parent lookups
CREATE INDEX IF NOT EXISTS idx_animals_father_id ON public.animals(father_id);
CREATE INDEX IF NOT EXISTS idx_animals_mother_id ON public.animals(mother_id);
CREATE INDEX IF NOT EXISTS idx_animals_toro_servicio_id ON public.animals(toro_servicio_id);
CREATE INDEX IF NOT EXISTS idx_animals_id_tag ON public.animals(id_tag);

-- Create function to automatically categorize animals based on age and sex
CREATE OR REPLACE FUNCTION public.categorize_animal(
  birth_date DATE,
  sex TEXT,
  current_date DATE DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  check_date DATE;
  age_months INTEGER;
BEGIN
  -- Use current date if not provided
  check_date := COALESCE(current_date, CURRENT_DATE);
  
  IF birth_date IS NULL OR sex IS NULL THEN
    RETURN 'Desconocido';
  END IF;
  
  age_months := EXTRACT(MONTH FROM AGE(check_date, birth_date));
  
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
$$ LANGUAGE plpgsql;

-- Create function to check consanguinity (inbreeding coefficient)
CREATE OR REPLACE FUNCTION public.check_consanguinity(
  animal_father_id UUID,
  animal_mother_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  common_ancestor_count INTEGER := 0;
  inbreeding_coefficient NUMERIC := 0.0;
BEGIN
  -- Simple consanguinity check - count common ancestors in 2 generations
  IF animal_father_id IS NULL OR animal_mother_id IS NULL THEN
    RETURN 0.0;
  END IF;
  
  -- Check if parents share the same father (paternal grandfather)
  IF EXISTS (
    SELECT 1 FROM animals a1, animals a2 
    WHERE a1.id = animal_father_id 
    AND a2.id = animal_mother_id
    AND a1.father_id IS NOT NULL 
    AND a1.father_id = a2.father_id
  ) THEN
    common_ancestor_count := common_ancestor_count + 1;
  END IF;
  
  -- Check if parents share the same mother (maternal grandmother)
  IF EXISTS (
    SELECT 1 FROM animals a1, animals a2 
    WHERE a1.id = animal_father_id 
    AND a2.id = animal_mother_id
    AND a1.mother_id IS NOT NULL 
    AND a1.mother_id = a2.mother_id
  ) THEN
    common_ancestor_count := common_ancestor_count + 1;
  END IF;
  
  -- Calculate basic inbreeding coefficient
  -- This is a simplified calculation - real consanguinity requires more complex pedigree analysis
  inbreeding_coefficient := common_ancestor_count * 0.25;
  
  RETURN inbreeding_coefficient;
END;
$$ LANGUAGE plpgsql;