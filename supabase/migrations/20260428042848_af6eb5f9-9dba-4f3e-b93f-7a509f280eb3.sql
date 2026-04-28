CREATE OR REPLACE FUNCTION public.calculate_animal_score_data(
  _animal_id uuid,
  _cabana_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  _animal record;
  _weight_stats record;
  _repro_stats record;
  _vaccine_stats record;
  _herd_avg numeric;
  _adg_percentile numeric;
  _total_offspring int := 0;
  _live_offspring int := 0;
  _body_condition numeric;
BEGIN
  IF NOT public.current_user_is_active_in_cabana(_cabana_id) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _animal
  FROM public.animals
  WHERE id = _animal_id
    AND "cabaña_id" = _cabana_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT
    COUNT(*)::int AS weight_count,
    CASE
      WHEN COUNT(*) >= 3 THEN
        CASE
          WHEN COALESCE((
            SELECT ganancia_diaria
            FROM public.animal_weight_history
            WHERE animal_id = _animal_id
              AND "cabaña_id" = _cabana_id
              AND ganancia_diaria IS NOT NULL
            ORDER BY fecha DESC
            LIMIT 1
          ), 0) > COALESCE((
            SELECT AVG(ganancia_diaria)
            FROM public.animal_weight_history
            WHERE animal_id = _animal_id
              AND "cabaña_id" = _cabana_id
              AND ganancia_diaria > 0
          ), 0) THEN 'ascending'
          WHEN COALESCE((
            SELECT ganancia_diaria
            FROM public.animal_weight_history
            WHERE animal_id = _animal_id
              AND "cabaña_id" = _cabana_id
              AND ganancia_diaria IS NOT NULL
            ORDER BY fecha DESC
            LIMIT 1
          ), 0) < COALESCE((
            SELECT AVG(ganancia_diaria)
            FROM public.animal_weight_history
            WHERE animal_id = _animal_id
              AND "cabaña_id" = _cabana_id
              AND ganancia_diaria > 0
          ), 0) * 0.9 THEN 'descending'
          ELSE 'stable'
        END
      ELSE NULL
    END AS weight_trend
  INTO _weight_stats
  FROM public.animal_weight_history
  WHERE animal_id = _animal_id
    AND "cabaña_id" = _cabana_id;

  IF _animal.sex = 'Hembra' THEN
    SELECT
      COUNT(*)::int AS total_services,
      COUNT(*) FILTER (WHERE estado_final IN ('activa', 'exitosa'))::int AS total_pregnancies,
      COUNT(*) FILTER (WHERE estado_final = 'exitosa')::int AS successful_pregnancies,
      CASE
        WHEN COALESCE(_animal.esta_preñada, false) THEN 0
        WHEN EXISTS (
          SELECT 1 FROM public.preñeces
          WHERE animal_id = _animal_id AND estado_final = 'exitosa'
        ) THEN EXTRACT(DAY FROM now() - COALESCE((
          SELECT MAX(fecha_finalizacion)::timestamp with time zone
          FROM public.preñeces
          WHERE animal_id = _animal_id AND estado_final = 'exitosa'
        ), now()))::int
        ELSE NULL
      END AS days_open
    INTO _repro_stats
    FROM public.preñeces
    WHERE animal_id = _animal_id;
  ELSE
    SELECT 0::int AS total_services, 0::int AS total_pregnancies, 0::int AS successful_pregnancies, NULL::int AS days_open
    INTO _repro_stats;
  END IF;

  SELECT COUNT(*)::int,
         COUNT(*) FILTER (WHERE lower(COALESCE(status, '')) NOT IN ('muerto', 'dead'))::int
  INTO _total_offspring, _live_offspring
  FROM public.animals
  WHERE (mother_id = _animal_id OR father_id = _animal_id)
    AND "cabaña_id" = _cabana_id;

  SELECT
    COUNT(*)::int AS required,
    COUNT(*) FILTER (WHERE status = 'compliant')::int AS completed,
    COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue
  INTO _vaccine_stats
  FROM (
    SELECT
      CASE
        WHEN av.id IS NOT NULL AND COALESCE(av.is_complete, false) THEN 'compliant'
        WHEN av.id IS NOT NULL AND COALESCE(av.is_complete, false) = false AND av.next_due < CURRENT_DATE THEN 'overdue'
        WHEN av.id IS NULL THEN 'missing'
        ELSE 'pending'
      END AS status
    FROM public.cabaña_vaccination_requirements cvr
    LEFT JOIN public.animal_vaccines av
      ON av.animal_id = _animal_id
     AND av.vaccine_code = cvr.vaccine_code
     AND av."cabaña_id" = _cabana_id
    WHERE cvr."cabaña_id" = _cabana_id
      AND cvr.is_mandatory = true
      AND cvr.is_active = true
  ) sub;

  SELECT AVG(ganancia_diaria_kg)
  INTO _herd_avg
  FROM public.animals
  WHERE "cabaña_id" = _cabana_id
    AND lower(COALESCE(status, '')) IN ('activo', 'active')
    AND ganancia_diaria_kg > 0;

  IF _animal.ganancia_diaria_kg IS NOT NULL AND _animal.ganancia_diaria_kg > 0 THEN
    SELECT (COUNT(*) FILTER (WHERE ganancia_diaria_kg < _animal.ganancia_diaria_kg)::numeric / NULLIF(COUNT(*), 0) * 100)
    INTO _adg_percentile
    FROM public.animals
    WHERE "cabaña_id" = _cabana_id
      AND lower(COALESCE(status, '')) IN ('activo', 'active')
      AND ganancia_diaria_kg > 0;
  END IF;

  _body_condition := CASE
    WHEN _animal.condicion_corporal ~ '^[0-9]+(\.[0-9]+)?$' THEN _animal.condicion_corporal::numeric
    ELSE NULL
  END;

  result := jsonb_build_object(
    'sex', _animal.sex,
    'breed', _animal.breed,
    'birthDate', _animal.birth_date,
    'pesoNacimiento', COALESCE(_animal.peso_nacimiento, _animal.peso_nacer),
    'pesoDestete', COALESCE(_animal.peso_destete, _animal.peso_destete_mejorado),
    'pesoFinal', COALESCE(_animal.peso_final, _animal.peso_final_mejorado),
    'pesoActual', _animal.peso_actual_kg,
    'adg', _animal.ganancia_diaria_kg,
    'adgPercentile', ROUND(_adg_percentile, 1),
    'weightRecordCount', COALESCE(_weight_stats.weight_count, 0),
    'weightTrend', _weight_stats.weight_trend,
    'totalServices', COALESCE(_repro_stats.total_services, 0),
    'totalPregnancies', COALESCE(_repro_stats.total_pregnancies, 0),
    'successfulPregnancies', COALESCE(_repro_stats.successful_pregnancies, 0),
    'totalOffspring', _total_offspring,
    'liveOffspring', _live_offspring,
    'daysOpen', _repro_stats.days_open,
    'isPregnant', COALESCE(_animal.esta_preñada, false),
    'requiredVaccines', COALESCE(_vaccine_stats.required, 0),
    'completedVaccines', COALESCE(_vaccine_stats.completed, 0),
    'overdueVaccines', COALESCE(_vaccine_stats.overdue, 0),
    'condicionCorporal', _body_condition,
    'registrationLevel', _animal.registration_level,
    'dnaVerified', COALESCE(_animal.dna_verified, false),
    'hasFather', (_animal.father_id IS NOT NULL OR NULLIF(_animal.father_name, '') IS NOT NULL),
    'hasMother', (_animal.mother_id IS NOT NULL OR NULLIF(_animal.mother_name, '') IS NOT NULL),
    'fatherRegistration', COALESCE(_animal.registration_father_level, _animal.father_registration),
    'motherRegistration', COALESCE(_animal.registration_mother_level, _animal.mother_registration),
    'herdAvgAdg', _herd_avg
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_herd_scores(
  _cabana_id uuid,
  _animal_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  animal_id uuid,
  score_data jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_active_in_cabana(_cabana_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.id AS animal_id,
         public.calculate_animal_score_data(a.id, _cabana_id) AS score_data
  FROM public.animals a
  WHERE a."cabaña_id" = _cabana_id
    AND lower(COALESCE(a.status, '')) IN ('activo', 'active')
    AND (_animal_ids IS NULL OR a.id = ANY(_animal_ids))
  ORDER BY a.id_tag;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_animal_score_data(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_herd_scores(uuid, uuid[]) TO authenticated;