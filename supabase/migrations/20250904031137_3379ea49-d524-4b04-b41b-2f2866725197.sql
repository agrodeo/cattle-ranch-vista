-- Fix the function to use existing tables (preñeces instead of pregnancies)
DROP FUNCTION IF EXISTS rpc_reproductive_detailed_metrics(uuid, jsonb);

CREATE OR REPLACE FUNCTION rpc_reproductive_detailed_metrics(
  _user_id uuid,
  filters_json jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  animal_id uuid,
  tag text,
  name text,
  age_months integer,
  category text,
  corral_id uuid,
  corral_name text,
  is_pregnant boolean,
  pregnancy_date timestamptz,
  expected_calving_date timestamptz,
  last_service_date timestamptz,
  days_open integer,
  reproductive_years integer,
  total_offspring integer,
  lifetime_services integer,
  lifetime_pregnancies integer,
  lifetime_calvings integer,
  individual_pregnancy_rate numeric,
  individual_calving_rate numeric,
  performance_level text,
  active_alerts integer,
  alert_types text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _date_from timestamptz;
  _date_to timestamptz;
  _include_sold_dead boolean;
  _corral_ids uuid[];
  _performance text;
  _alert_status text;
  cabana_uuid uuid;
BEGIN
  -- Get user's cabaña
  SELECT cabana_id INTO cabana_uuid FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;

  -- Extract filters
  _date_from := COALESCE((filters_json->>'date_from')::timestamptz, CURRENT_DATE - INTERVAL '1 year');
  _date_to := COALESCE((filters_json->>'date_to')::timestamptz, CURRENT_DATE);
  _include_sold_dead := COALESCE((filters_json->>'include_sold_dead')::boolean, false);
  
  -- Extract array filters safely
  IF filters_json ? 'corral_ids' AND jsonb_typeof(filters_json->'corral_ids') = 'array' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids')::uuid) INTO _corral_ids;
  END IF;
  
  _performance := filters_json->>'performance';
  _alert_status := filters_json->>'alert_status';

  RETURN QUERY
  SELECT 
    a.id as animal_id,
    a.id_tag as tag,
    a.name,
    CASE 
      WHEN a.birth_date IS NOT NULL AND a.birth_date <= CURRENT_DATE 
      THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date))::integer * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::integer
      ELSE NULL 
    END as age_months,
    a.category,
    a.corral_id,
    c.name as corral_name,
    COALESCE(a.esta_preñada, false) as is_pregnant,
    a.fecha_ultima_preñez::timestamptz as pregnancy_date,
    a.fecha_probable_parto::timestamptz as expected_calving_date,
    (
      SELECT MAX(e.fecha)
      FROM public.ia 
      JOIN public.eventos e ON ia.evento_id = e.id
      WHERE a.id = ANY(ia.animales_ids)
        AND e.cabaña_id = cabana_uuid
    )::timestamptz as last_service_date,
    CASE 
      WHEN a.esta_preñada = true THEN NULL
      ELSE COALESCE(
        EXTRACT(DAY FROM CURRENT_DATE - (
          SELECT MAX(e.fecha)
          FROM public.ia 
          JOIN public.eventos e ON ia.evento_id = e.id
          WHERE a.id = ANY(ia.animales_ids)
            AND e.cabaña_id = cabana_uuid
        ))::integer,
        CASE WHEN a.birth_date IS NOT NULL THEN EXTRACT(DAY FROM AGE(CURRENT_DATE, a.birth_date))::integer ELSE NULL END
      )
    END as days_open,
    CASE 
      WHEN a.birth_date IS NOT NULL AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 18
      THEN GREATEST(1, EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date + INTERVAL '18 months'))::integer)
      ELSE 0
    END as reproductive_years,
    COALESCE((
      SELECT COUNT(*)
      FROM public.animals offspring
      WHERE offspring.mother_id = a.id
        AND offspring.cabaña_id = cabana_uuid
        AND (_include_sold_dead OR offspring.status NOT IN ('vendido', 'muerto', 'Vendido', 'Muerto'))
    ), 0)::integer as total_offspring,
    COALESCE((
      SELECT COUNT(*)
      FROM public.ia 
      JOIN public.eventos e ON ia.evento_id = e.id
      WHERE a.id = ANY(ia.animales_ids)
        AND e.cabaña_id = cabana_uuid
        AND e.fecha >= _date_from::date
        AND e.fecha <= _date_to::date
    ), 0)::integer as lifetime_services,
    COALESCE((
      SELECT COUNT(*)
      FROM public.preñeces preg
      WHERE preg.animal_id = a.id
        AND preg.cabaña_id = cabana_uuid
        AND preg.fecha_inicio >= _date_from::date
        AND preg.fecha_inicio <= _date_to::date
    ), 0)::integer as lifetime_pregnancies,
    COALESCE((
      SELECT COUNT(*)
      FROM public.animals offspring
      WHERE offspring.mother_id = a.id
        AND offspring.cabaña_id = cabana_uuid
        AND offspring.birth_date >= _date_from::date
        AND offspring.birth_date <= _date_to::date
        AND (_include_sold_dead OR offspring.status NOT IN ('vendido', 'muerto', 'Vendido', 'Muerto'))
    ), 0)::integer as lifetime_calvings,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*)
        FROM public.ia 
        JOIN public.eventos e ON ia.evento_id = e.id
        WHERE a.id = ANY(ia.animales_ids)
          AND e.cabaña_id = cabana_uuid
      ), 0) = 0 THEN 0
      ELSE ROUND(
        COALESCE((
          SELECT COUNT(*)
          FROM public.preñeces preg
          WHERE preg.animal_id = a.id
            AND preg.cabaña_id = cabana_uuid
        ), 0)::numeric / NULLIF(COALESCE((
          SELECT COUNT(*)
          FROM public.ia 
          JOIN public.eventos e ON ia.evento_id = e.id
          WHERE a.id = ANY(ia.animales_ids)
            AND e.cabaña_id = cabana_uuid
        ), 0)::numeric, 0) * 100, 2
      )
    END as individual_pregnancy_rate,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*)
        FROM public.preñeces preg
        WHERE preg.animal_id = a.id
          AND preg.cabaña_id = cabana_uuid
      ), 0) = 0 THEN 0
      ELSE ROUND(
        COALESCE((
          SELECT COUNT(*)
          FROM public.animals offspring
          WHERE offspring.mother_id = a.id
            AND offspring.cabaña_id = cabana_uuid
            AND (_include_sold_dead OR offspring.status NOT IN ('vendido', 'muerto', 'Vendido', 'Muerto'))
        ), 0)::numeric / NULLIF(COALESCE((
          SELECT COUNT(*)
          FROM public.preñeces preg
          WHERE preg.animal_id = a.id
            AND preg.cabaña_id = cabana_uuid
        ), 0)::numeric, 0) * 100, 2
      )
    END as individual_calving_rate,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*)
        FROM public.ia 
        JOIN public.eventos e ON ia.evento_id = e.id
        WHERE a.id = ANY(ia.animales_ids)
          AND e.cabaña_id = cabana_uuid
      ), 0) >= 3 AND 
      ROUND(
        COALESCE((
          SELECT COUNT(*)
          FROM public.preñeces preg
          WHERE preg.animal_id = a.id
            AND preg.cabaña_id = cabana_uuid
        ), 0)::numeric / NULLIF(COALESCE((
          SELECT COUNT(*)
          FROM public.ia 
          JOIN public.eventos e ON ia.evento_id = e.id
          WHERE a.id = ANY(ia.animales_ids)
            AND e.cabaña_id = cabana_uuid
        ), 0)::numeric, 0) * 100, 2
      ) >= 60 THEN 'Alto'
      WHEN COALESCE((
        SELECT COUNT(*)
        FROM public.ia 
        JOIN public.eventos e ON ia.evento_id = e.id
        WHERE a.id = ANY(ia.animales_ids)
          AND e.cabaña_id = cabana_uuid
      ), 0) >= 2 THEN 'Medio'
      ELSE 'Bajo'
    END as performance_level,
    COALESCE((
      SELECT COUNT(*)
      FROM public.reproductive_alerts ra
      WHERE ra.animal_id = a.id
        AND ra.status = 'pending'
        AND ra.cabaña_id = cabana_uuid
    ), 0)::integer as active_alerts,
    COALESCE((
      SELECT ARRAY_AGG(DISTINCT ra.alert_type)
      FROM public.reproductive_alerts ra
      WHERE ra.animal_id = a.id
        AND ra.status = 'pending'
        AND ra.cabaña_id = cabana_uuid
    ), ARRAY[]::text[]) as alert_types
  FROM public.animals a
  LEFT JOIN public.corrales c ON c.id = a.corral_id AND c.cabaña_id = cabana_uuid
  WHERE a.cabaña_id = cabana_uuid
    AND a.sex = 'Hembra'
    AND a.category IN ('Vaquillona', 'Vaca', 'vaquillona', 'vaca')
    AND (_include_sold_dead OR a.status NOT IN ('vendido', 'muerto', 'Vendido', 'Muerto'))
    AND (_corral_ids IS NULL OR a.corral_id = ANY(_corral_ids))
    AND (a.birth_date IS NULL OR EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 15)
  ORDER BY a.id_tag;
END;
$$;