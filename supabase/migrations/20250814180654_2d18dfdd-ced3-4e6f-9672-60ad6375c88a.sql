-- Create catalog for death causes
CREATE TABLE IF NOT EXISTS public.catalogo_causas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabaña_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create deaths table
CREATE TABLE IF NOT EXISTS public.defunciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  fecha_defuncion DATE NOT NULL,
  causa_id UUID REFERENCES public.catalogo_causas(id),
  causa_texto TEXT,
  notas TEXT,
  registrado_por UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT chk_fecha_defuncion_no_futura CHECK (fecha_defuncion <= CURRENT_DATE)
);

-- Add computed columns for age at death
ALTER TABLE public.defunciones 
ADD COLUMN IF NOT EXISTS edad_dias INTEGER GENERATED ALWAYS AS (
  CASE 
    WHEN (SELECT birth_date FROM public.animals WHERE id = animal_id) IS NOT NULL 
    THEN fecha_defuncion - (SELECT birth_date FROM public.animals WHERE id = animal_id)
    ELSE NULL
  END
) STORED;

ALTER TABLE public.defunciones 
ADD COLUMN IF NOT EXISTS edad_meses INTEGER GENERATED ALWAYS AS (
  CASE 
    WHEN edad_dias IS NOT NULL 
    THEN FLOOR(edad_dias / 30.44)
    ELSE NULL
  END
) STORED;

-- Add defuncion_id to animals table if not exists
ALTER TABLE public.animals 
ADD COLUMN IF NOT EXISTS defuncion_id UUID REFERENCES public.defunciones(id);

-- Add constraint to animals table (check if constraint exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'animals' 
    AND constraint_name = 'chk_defuncion_coherente'
  ) THEN
    ALTER TABLE public.animals 
    ADD CONSTRAINT chk_defuncion_coherente 
    CHECK (birth_date IS NULL OR fecha_muerte IS NULL OR fecha_muerte >= birth_date);
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.catalogo_causas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defunciones ENABLE ROW LEVEL SECURITY;

-- RLS policies for catalogo_causas
CREATE POLICY "Users can manage death causes in their cabaña" 
ON public.catalogo_causas 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.cabaña_id = catalogo_causas.cabaña_id
));

-- RLS policies for defunciones
CREATE POLICY "Users can manage deaths in their cabaña" 
ON public.defunciones 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.cabaña_id = defunciones.cabaña_id
));

-- Create function to mark animal as deceased
CREATE OR REPLACE FUNCTION public.marcar_defuncion(
  _animal_id UUID,
  _fecha_defuncion DATE,
  _causa_id UUID DEFAULT NULL,
  _causa_texto TEXT DEFAULT NULL,
  _notas TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _cabana_id UUID;
  _user_id UUID;
  _animal_status TEXT;
  _birth_date DATE;
  _defuncion_id UUID;
  _edad_dias INTEGER;
  _edad_meses INTEGER;
  result JSON;
BEGIN
  -- Get current user and verify permissions
  SELECT id INTO _user_id FROM auth.users WHERE id = auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Get user's cabaña_id
  SELECT cabaña_id INTO _cabana_id FROM public.users WHERE id = _user_id;
  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;
  
  -- Verify animal exists and belongs to user's cabaña
  SELECT status, birth_date, cabaña_id 
  INTO _animal_status, _birth_date, _cabana_id
  FROM public.animals 
  WHERE id = _animal_id AND cabaña_id = _cabana_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Animal no encontrado o no pertenece a su cabaña';
  END IF;
  
  -- Check if animal is already dead
  IF _animal_status = 'muerto' THEN
    RAISE EXCEPTION 'El animal ya está marcado como fallecido';
  END IF;
  
  -- Check if animal is sold
  IF _animal_status = 'vendido' THEN
    RAISE EXCEPTION 'No se puede marcar como fallecido un animal vendido';
  END IF;
  
  -- Validate death date
  IF _fecha_defuncion > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de defunción no puede ser futura';
  END IF;
  
  IF _birth_date IS NOT NULL AND _fecha_defuncion < _birth_date THEN
    RAISE EXCEPTION 'La fecha de defunción no puede ser anterior al nacimiento';
  END IF;
  
  -- Calculate age at death
  IF _birth_date IS NOT NULL THEN
    _edad_dias := _fecha_defuncion - _birth_date;
    _edad_meses := FLOOR(_edad_dias / 30.44);
  END IF;
  
  -- Insert death record
  INSERT INTO public.defunciones (
    animal_id, cabaña_id, fecha_defuncion, causa_id, causa_texto, 
    notas, registrado_por
  ) VALUES (
    _animal_id, _cabana_id, _fecha_defuncion, _causa_id, _causa_texto,
    _notas, _user_id
  ) RETURNING id INTO _defuncion_id;
  
  -- Update animal status
  UPDATE public.animals 
  SET 
    status = 'muerto',
    fecha_muerte = _fecha_defuncion,
    defuncion_id = _defuncion_id,
    corral_id = NULL
  WHERE id = _animal_id;
  
  -- Build result
  result := json_build_object(
    'defuncion_id', _defuncion_id,
    'animal_id', _animal_id,
    'fecha_defuncion', _fecha_defuncion,
    'edad_dias', _edad_dias,
    'edad_meses', _edad_meses,
    'success', true,
    'message', 'Animal marcado como fallecido correctamente'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create function to manage death causes
CREATE OR REPLACE FUNCTION public.manage_death_causes(
  _action TEXT, -- 'list', 'create', 'update', 'delete'
  _id UUID DEFAULT NULL,
  _nombre TEXT DEFAULT NULL,
  _activo BOOLEAN DEFAULT true,
  _orden INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _cabana_id UUID;
  _user_id UUID;
  _cause_id UUID;
  result JSON;
BEGIN
  -- Get current user and verify permissions
  SELECT id INTO _user_id FROM auth.users WHERE id = auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Get user's cabaña_id
  SELECT cabaña_id INTO _cabana_id FROM public.users WHERE id = _user_id;
  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;
  
  CASE _action
    WHEN 'list' THEN
      SELECT json_agg(
        json_build_object(
          'id', id,
          'nombre', nombre,
          'activo', activo,
          'orden', orden
        ) ORDER BY orden, nombre
      ) INTO result
      FROM public.catalogo_causas
      WHERE cabaña_id = _cabana_id AND activo = true;
      
      RETURN COALESCE(result, '[]'::json);
      
    WHEN 'create' THEN
      IF _nombre IS NULL OR TRIM(_nombre) = '' THEN
        RAISE EXCEPTION 'El nombre de la causa es requerido';
      END IF;
      
      INSERT INTO public.catalogo_causas (cabaña_id, nombre, activo, orden)
      VALUES (_cabana_id, TRIM(_nombre), _activo, COALESCE(_orden, 0))
      RETURNING id INTO _cause_id;
      
      RETURN json_build_object(
        'id', _cause_id,
        'success', true,
        'message', 'Causa de muerte creada correctamente'
      );
      
    WHEN 'update' THEN
      IF _id IS NULL THEN
        RAISE EXCEPTION 'ID de causa requerido para actualizar';
      END IF;
      
      UPDATE public.catalogo_causas 
      SET 
        nombre = COALESCE(TRIM(_nombre), nombre),
        activo = COALESCE(_activo, activo),
        orden = COALESCE(_orden, orden),
        updated_at = now()
      WHERE id = _id AND cabaña_id = _cabana_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Causa no encontrada';
      END IF;
      
      RETURN json_build_object(
        'success', true,
        'message', 'Causa actualizada correctamente'
      );
      
    WHEN 'delete' THEN
      IF _id IS NULL THEN
        RAISE EXCEPTION 'ID de causa requerido para eliminar';
      END IF;
      
      -- Soft delete by setting activo = false
      UPDATE public.catalogo_causas 
      SET activo = false, updated_at = now()
      WHERE id = _id AND cabaña_id = _cabana_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Causa no encontrada';
      END IF;
      
      RETURN json_build_object(
        'success', true,
        'message', 'Causa desactivada correctamente'
      );
      
    ELSE
      RAISE EXCEPTION 'Acción no válida: %', _action;
  END CASE;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Insert default death causes
INSERT INTO public.catalogo_causas (cabaña_id, nombre, orden) 
SELECT DISTINCT cabaña_id, causa, orden
FROM (
  SELECT 
    c.id as cabaña_id,
    unnest(ARRAY[
      'Neumonía',
      'Diarrea neonatal', 
      'Torsión de abomaso',
      'Accidente',
      'Predadores',
      'Intoxicación',
      'Distocia (parto difícil)',
      'Mastitis',
      'Enfermedad metabólica',
      'Otra causa'
    ]) as causa,
    unnest(ARRAY[1,2,3,4,5,6,7,8,9,10]) as orden
  FROM public.cabañas c
) causes
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalogo_causas cc 
  WHERE cc.cabaña_id = causes.cabaña_id
);

-- Create triggers for updated_at
CREATE TRIGGER update_catalogo_causas_updated_at
  BEFORE UPDATE ON public.catalogo_causas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_defunciones_updated_at
  BEFORE UPDATE ON public.defunciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();