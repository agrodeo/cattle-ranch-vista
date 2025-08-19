-- Crear tabla de toros (catálogo)
CREATE TABLE IF NOT EXISTS public.bulls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabaña_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  identificador TEXT,            -- RP/ID del toro o código de pajuela
  raza TEXT NOT NULL,            -- Braford, Brangus, Angus, Brahman, etc.
  registro TEXT,                 -- p.ej. ABA/Controlado/Avanzado/Definitivo
  adn_verificado BOOLEAN DEFAULT FALSE,
  ce_cm NUMERIC,                 -- circunferencia escrotal
  peso_nacer_kg NUMERIC,
  peso_destete_kg NUMERIC,
  peso_final_kg NUMERIC,
  centro_semen TEXT,
  horn_status TEXT,              -- Braford: Astado | Mocho | Mocho homocigota
  pelaje TEXT,                   -- Brangus/Angus: Negro | Colorado | Homocigota
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Servicios de IA (cabecera del lote)
CREATE TABLE IF NOT EXISTS public.ia_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabaña_id UUID NOT NULL,
  fecha DATE NOT NULL,
  toro_id UUID REFERENCES public.bulls(id),
  toro_manual JSONB,             -- si no se usa catálogo
  veterinario TEXT,              -- nombre del profesional
  observaciones TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Animales del servicio + estado de preñez
CREATE TABLE IF NOT EXISTS public.ia_service_animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.ia_services(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animals(id),
  cabaña_id UUID NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',  -- pendiente | preñada | vacía
  fecha_control DATE,                        -- fecha sugerida de tacto (45-60 d)
  fpp DATE,                                  -- fecha probable de parto (fecha + 283 d)
  result_source TEXT,                        -- 'tacto' | 'parto' | 'manual'
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_id, animal_id)              -- evitar duplicados
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.bulls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_service_animals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bulls
CREATE POLICY "Users can view bulls for their cabaña" ON public.bulls
  FOR SELECT USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can insert bulls for their cabaña" ON public.bulls
  FOR INSERT WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can update bulls for their cabaña" ON public.bulls
  FOR UPDATE USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can delete bulls for their cabaña" ON public.bulls
  FOR DELETE USING (cabaña_id = get_current_user_cabana_id());

-- Políticas RLS para ia_services
CREATE POLICY "Users can view ia_services for their cabaña" ON public.ia_services
  FOR SELECT USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can insert ia_services for their cabaña" ON public.ia_services
  FOR INSERT WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can update ia_services for their cabaña" ON public.ia_services
  FOR UPDATE USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can delete ia_services for their cabaña" ON public.ia_services
  FOR DELETE USING (cabaña_id = get_current_user_cabana_id());

-- Políticas RLS para ia_service_animals
CREATE POLICY "Users can view ia_service_animals for their cabaña" ON public.ia_service_animals
  FOR SELECT USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can insert ia_service_animals for their cabaña" ON public.ia_service_animals
  FOR INSERT WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can update ia_service_animals for their cabaña" ON public.ia_service_animals
  FOR UPDATE USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can delete ia_service_animals for their cabaña" ON public.ia_service_animals
  FOR DELETE USING (cabaña_id = get_current_user_cabana_id());

-- Triggers para updated_at
CREATE TRIGGER update_bulls_updated_at
  BEFORE UPDATE ON public.bulls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ia_services_updated_at
  BEFORE UPDATE ON public.ia_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ia_service_animals_updated_at
  BEFORE UPDATE ON public.ia_service_animals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para obtener hembras elegibles para IA
CREATE OR REPLACE FUNCTION public.get_eligible_females_for_ia(_user_id UUID, _min_age_months INTEGER DEFAULT 15, _corrales UUID[] DEFAULT NULL, _search TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  name TEXT,
  id_tag TEXT,
  birth_date DATE,
  age_months INTEGER,
  corral_id UUID,
  corral_name TEXT,
  category TEXT,
  breed TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_cabana_id UUID;
BEGIN
  -- Obtener cabaña del usuario
  SELECT cabaña_id INTO user_cabana_id FROM public.users WHERE id = _user_id;
  IF user_cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.id_tag,
    a.birth_date,
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER as age_months,
    a.corral_id,
    c.name as corral_name,
    public.categorize_animal(a.birth_date, a.sex, CURRENT_DATE) as category,
    a.breed
  FROM public.animals a
  LEFT JOIN public.corrales c ON a.corral_id = c.id
  WHERE a.cabaña_id = user_cabana_id
    AND a.sex = 'Hembra'
    AND a.status = 'activo'
    AND (a.esta_preñada IS FALSE OR a.esta_preñada IS NULL)
    AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER >= _min_age_months
    AND (_corrales IS NULL OR a.corral_id = ANY(_corrales))
    AND (_search IS NULL OR 
         a.name ILIKE '%' || _search || '%' OR 
         a.id_tag ILIKE '%' || _search || '%')
  ORDER BY a.name, a.id_tag;
END;
$function$;

-- Función para crear servicio de IA
CREATE OR REPLACE FUNCTION public.create_ia_service(
  _user_id UUID,
  _fecha DATE,
  _toro_id UUID DEFAULT NULL,
  _toro_manual JSONB DEFAULT NULL,
  _veterinario TEXT DEFAULT NULL,
  _observaciones TEXT DEFAULT NULL,
  _animal_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_cabana_id UUID;
  service_id UUID;
  animal_id UUID;
  fecha_control DATE;
  fpp DATE;
  result JSONB;
BEGIN
  -- Validaciones
  IF _fecha > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha del servicio no puede ser futura';
  END IF;
  
  IF array_length(_animal_ids, 1) = 0 OR _animal_ids IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar al menos una hembra';
  END IF;
  
  IF _toro_id IS NULL AND _toro_manual IS NULL THEN
    RAISE EXCEPTION 'Debe especificar un toro del catálogo o datos manuales';
  END IF;

  -- Obtener cabaña del usuario
  SELECT cabaña_id INTO user_cabana_id FROM public.users WHERE id = _user_id;
  IF user_cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;

  -- Calcular fechas
  fecha_control := _fecha + INTERVAL '45 days';
  fpp := _fecha + INTERVAL '283 days';

  -- Crear servicio
  INSERT INTO public.ia_services (
    cabaña_id, fecha, toro_id, toro_manual, veterinario, observaciones, created_by
  ) VALUES (
    user_cabana_id, _fecha, _toro_id, _toro_manual, _veterinario, _observaciones, _user_id
  ) RETURNING id INTO service_id;

  -- Crear registros para cada animal
  FOREACH animal_id IN ARRAY _animal_ids
  LOOP
    -- Verificar elegibilidad del animal
    IF NOT EXISTS(
      SELECT 1 FROM public.animals 
      WHERE id = animal_id 
        AND cabaña_id = user_cabana_id
        AND sex = 'Hembra'
        AND status = 'activo'
        AND (esta_preñada IS FALSE OR esta_preñada IS NULL)
        AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date))::INTEGER >= 15
    ) THEN
      RAISE EXCEPTION 'Animal % no es elegible para IA', animal_id;
    END IF;

    -- Insertar en ia_service_animals
    INSERT INTO public.ia_service_animals (
      service_id, animal_id, cabaña_id, fecha_control, fpp
    ) VALUES (
      service_id, animal_id, user_cabana_id, fecha_control, fpp
    );
  END LOOP;

  -- Crear evento en historial
  INSERT INTO public.eventos (
    cabaña_id, tipo, fecha, creado_por, notas, payload
  ) VALUES (
    user_cabana_id, 
    'inseminacion_artificial', 
    _fecha, 
    _user_id,
    COALESCE(_observaciones, ''),
    jsonb_build_object(
      'service_id', service_id,
      'animal_count', array_length(_animal_ids, 1),
      'veterinario', _veterinario
    )
  );

  -- Retornar resultado
  result := jsonb_build_object(
    'service_id', service_id,
    'animals_count', array_length(_animal_ids, 1),
    'fecha_control', fecha_control,
    'fpp', fpp,
    'success', true
  );

  RETURN result;
END;
$function$;