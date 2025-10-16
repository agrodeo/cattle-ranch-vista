-- ============================================
-- FASE 1: Mejorar estructura de animal_vaccines
-- ============================================

-- Agregar campos necesarios a animal_vaccines
ALTER TABLE public.animal_vaccines 
ADD COLUMN IF NOT EXISTS dose_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.cabaña_vaccination_requirements(id),
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_animal_vaccines_animal_vaccine 
ON public.animal_vaccines(animal_id, vaccine_code);

CREATE INDEX IF NOT EXISTS idx_animal_vaccines_requirement 
ON public.animal_vaccines(requirement_id) WHERE requirement_id IS NOT NULL;

-- ============================================
-- FASE 2: Vista consolidada de vacunas históricas
-- ============================================

CREATE OR REPLACE VIEW public.vaccination_history_unified AS
SELECT 
  av.id,
  av.animal_id,
  av.cabaña_id,
  av.vaccine_code as vacuna,
  av.date as fecha,
  av.lot as lote,
  av.dose as dosis,
  av.route as via,
  av.next_due as proxima_dosis,
  av.dose_number,
  av.requirement_id,
  av.is_complete,
  av.created_at,
  'animal_vaccines' as source_table
FROM public.animal_vaccines av

UNION ALL

SELECT 
  vh.id,
  vh.animal_id,
  vh.cabaña_id,
  vh.vacuna,
  vh.fecha,
  vh.lote,
  vh.dosis,
  vh.via,
  vh.proxima_dosis,
  vh.dose_number,
  NULL as requirement_id,
  false as is_complete,
  vh.created_at,
  'vacunas_historial' as source_table
FROM public.vacunas_historial vh;

-- ============================================
-- FASE 3: Función de compliance por animal
-- ============================================

CREATE OR REPLACE FUNCTION public.get_vaccination_compliance(_animal_id UUID, _cabana_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  animal_record RECORD;
  animal_age_months INTEGER;
  requirement RECORD;
  vaccination_record RECORD;
  compliance_data JSONB := '[]'::JSONB;
  requirement_compliance JSONB;
  doses_given INTEGER;
  last_vaccination_date DATE;
  next_due_date DATE;
  is_overdue BOOLEAN;
  status TEXT;
  days_overdue INTEGER;
BEGIN
  -- Obtener información del animal
  SELECT a.*, 
         EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER * 12 + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::INTEGER as age_months
  INTO animal_record
  FROM animals a
  WHERE a.id = _animal_id AND a.cabaña_id = _cabana_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Animal no encontrado"}'::JSONB;
  END IF;
  
  animal_age_months := COALESCE(animal_record.age_months, 0);
  
  -- Iterar sobre cada requisito de vacunación
  FOR requirement IN 
    SELECT * FROM cabaña_vaccination_requirements 
    WHERE cabaña_id = _cabana_id 
      AND is_active = true
      AND (sex_restriction IS NULL OR sex_restriction = animal_record.sex)
      AND (min_age_months IS NULL OR animal_age_months >= min_age_months)
      AND (max_age_months IS NULL OR animal_age_months <= max_age_months)
    ORDER BY vaccine_name
  LOOP
    -- Contar dosis aplicadas para este requisito
    SELECT COUNT(*), MAX(date) 
    INTO doses_given, last_vaccination_date
    FROM animal_vaccines
    WHERE animal_id = _animal_id
      AND (requirement_id = requirement.id OR vaccine_code = requirement.vaccine_name);
    
    doses_given := COALESCE(doses_given, 0);
    
    -- Calcular próxima fecha de vencimiento
    next_due_date := NULL;
    is_overdue := false;
    days_overdue := 0;
    
    IF doses_given = 0 THEN
      status := 'not_started';
    ELSIF doses_given < COALESCE(requirement.doses_required, 1) THEN
      status := 'incomplete';
      IF last_vaccination_date IS NOT NULL AND requirement.interval_between_doses_days IS NOT NULL THEN
        next_due_date := last_vaccination_date + (requirement.interval_between_doses_days || ' days')::INTERVAL;
        IF next_due_date < CURRENT_DATE THEN
          is_overdue := true;
          days_overdue := CURRENT_DATE - next_due_date;
          status := 'overdue';
        ELSIF next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN
          status := 'due_soon';
        END IF;
      END IF;
    ELSE
      -- Esquema completo, verificar si necesita refuerzo
      IF requirement.frequency_months IS NOT NULL AND last_vaccination_date IS NOT NULL THEN
        next_due_date := last_vaccination_date + (requirement.frequency_months || ' months')::INTERVAL;
        IF next_due_date < CURRENT_DATE THEN
          is_overdue := true;
          days_overdue := CURRENT_DATE - next_due_date;
          status := 'overdue';
        ELSIF next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN
          status := 'due_soon';
        ELSE
          status := 'complete';
        END IF;
      ELSE
        status := 'complete';
      END IF;
    END IF;
    
    -- Construir objeto de compliance para este requisito
    requirement_compliance := jsonb_build_object(
      'requirement_id', requirement.id,
      'vaccine_name', requirement.vaccine_name,
      'vaccine_type', requirement.vaccine_type,
      'is_mandatory', requirement.is_mandatory,
      'doses_required', COALESCE(requirement.doses_required, 1),
      'doses_given', doses_given,
      'last_vaccination_date', last_vaccination_date,
      'next_due_date', next_due_date,
      'status', status,
      'is_overdue', is_overdue,
      'days_overdue', days_overdue,
      'description', requirement.description
    );
    
    compliance_data := compliance_data || requirement_compliance;
  END LOOP;
  
  RETURN jsonb_build_object(
    'animal_id', _animal_id,
    'animal_tag', animal_record.id_tag,
    'animal_name', animal_record.name,
    'age_months', animal_age_months,
    'vaccines', compliance_data
  );
END;
$$;

-- ============================================
-- FASE 4: Estadísticas de hato
-- ============================================

CREATE OR REPLACE FUNCTION public.get_herd_vaccination_stats(_cabana_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_animals INTEGER;
  fully_compliant INTEGER := 0;
  partially_compliant INTEGER := 0;
  non_compliant INTEGER := 0;
  animals_with_overdue INTEGER := 0;
  animals_due_soon INTEGER := 0;
  vaccine_stats JSONB := '[]'::JSONB;
  requirement RECORD;
  animal RECORD;
  compliance JSONB;
  vaccine_stat JSONB;
  animals_complete INTEGER;
  animals_incomplete INTEGER;
  animals_not_started INTEGER;
BEGIN
  -- Contar total de animales activos
  SELECT COUNT(*) INTO total_animals
  FROM animals
  WHERE cabaña_id = _cabana_id 
    AND status NOT IN ('vendido', 'muerto');
  
  -- Calcular compliance por cada animal
  FOR animal IN 
    SELECT id FROM animals 
    WHERE cabaña_id = _cabana_id 
      AND status NOT IN ('vendido', 'muerto')
  LOOP
    compliance := get_vaccination_compliance(animal.id, _cabana_id);
    
    -- Analizar el estado del animal
    DECLARE
      total_vaccines INTEGER;
      complete_vaccines INTEGER := 0;
      has_overdue BOOLEAN := false;
      has_due_soon BOOLEAN := false;
      vaccine JSONB;
    BEGIN
      SELECT jsonb_array_length(compliance->'vaccines') INTO total_vaccines;
      
      FOR vaccine IN SELECT * FROM jsonb_array_elements(compliance->'vaccines')
      LOOP
        IF (vaccine->>'status') = 'complete' THEN
          complete_vaccines := complete_vaccines + 1;
        END IF;
        IF (vaccine->>'status') = 'overdue' THEN
          has_overdue := true;
        END IF;
        IF (vaccine->>'status') = 'due_soon' THEN
          has_due_soon := true;
        END IF;
      END LOOP;
      
      IF complete_vaccines = total_vaccines AND total_vaccines > 0 THEN
        fully_compliant := fully_compliant + 1;
      ELSIF complete_vaccines > 0 THEN
        partially_compliant := partially_compliant + 1;
      ELSIF total_vaccines > 0 THEN
        non_compliant := non_compliant + 1;
      END IF;
      
      IF has_overdue THEN
        animals_with_overdue := animals_with_overdue + 1;
      END IF;
      
      IF has_due_soon THEN
        animals_due_soon := animals_due_soon + 1;
      END IF;
    END;
  END LOOP;
  
  -- Estadísticas por vacuna
  FOR requirement IN 
    SELECT * FROM cabaña_vaccination_requirements 
    WHERE cabaña_id = _cabana_id AND is_active = true
    ORDER BY vaccine_name
  LOOP
    animals_complete := 0;
    animals_incomplete := 0;
    animals_not_started := 0;
    
    FOR animal IN 
      SELECT id FROM animals 
      WHERE cabaña_id = _cabana_id 
        AND status NOT IN ('vendido', 'muerto')
    LOOP
      compliance := get_vaccination_compliance(animal.id, _cabana_id);
      
      DECLARE
        vaccine JSONB;
      BEGIN
        FOR vaccine IN SELECT * FROM jsonb_array_elements(compliance->'vaccines')
        LOOP
          IF (vaccine->>'requirement_id')::UUID = requirement.id THEN
            CASE (vaccine->>'status')
              WHEN 'complete' THEN animals_complete := animals_complete + 1;
              WHEN 'incomplete', 'due_soon', 'overdue' THEN animals_incomplete := animals_incomplete + 1;
              WHEN 'not_started' THEN animals_not_started := animals_not_started + 1;
            END CASE;
          END IF;
        END LOOP;
      END;
    END LOOP;
    
    vaccine_stat := jsonb_build_object(
      'vaccine_name', requirement.vaccine_name,
      'vaccine_type', requirement.vaccine_type,
      'is_mandatory', requirement.is_mandatory,
      'animals_complete', animals_complete,
      'animals_incomplete', animals_incomplete,
      'animals_not_started', animals_not_started,
      'coverage_percentage', CASE 
        WHEN total_animals > 0 THEN ROUND((animals_complete::NUMERIC / total_animals::NUMERIC) * 100, 1)
        ELSE 0 
      END
    );
    
    vaccine_stats := vaccine_stats || vaccine_stat;
  END LOOP;
  
  RETURN jsonb_build_object(
    'total_animals', total_animals,
    'fully_compliant', fully_compliant,
    'partially_compliant', partially_compliant,
    'non_compliant', non_compliant,
    'animals_with_overdue', animals_with_overdue,
    'animals_due_soon', animals_due_soon,
    'overall_compliance_percentage', CASE 
      WHEN total_animals > 0 THEN ROUND((fully_compliant::NUMERIC / total_animals::NUMERIC) * 100, 1)
      ELSE 0 
    END,
    'vaccine_stats', vaccine_stats
  );
END;
$$;

-- Otorgar permisos
GRANT SELECT ON public.vaccination_history_unified TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vaccination_compliance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_herd_vaccination_stats TO authenticated;