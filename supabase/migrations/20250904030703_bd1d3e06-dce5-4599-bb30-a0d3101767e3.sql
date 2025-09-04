-- Fix ambiguous column references in rpc_reproductive_detailed_metrics function
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
AS $$
DECLARE
  _date_from timestamptz;
  _date_to timestamptz;
  _include_sold_dead boolean;
  _corral_ids uuid[];
  _performance text;
  _alert_status text;
BEGIN
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
    a.tag,
    a.name,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date))::integer * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::integer as age_months,
    a.category,
    a.corral_id,
    c.name as corral_name,
    CASE WHEN p.animal_id IS NOT NULL THEN true ELSE false END as is_pregnant,
    p.pregnancy_date,
    p.expected_calving_date,
    (
      SELECT MAX(ai.service_date)
      FROM artificial_inseminations ai
      WHERE ai.animal_id = a.id
        AND ai.user_id = _user_id
    ) as last_service_date,
    CASE 
      WHEN p.animal_id IS NOT NULL THEN NULL
      ELSE COALESCE(
        EXTRACT(DAY FROM CURRENT_DATE - (
          SELECT MAX(COALESCE(ai.service_date, ai.created_at::date))
          FROM artificial_inseminations ai
          WHERE ai.animal_id = a.id
            AND ai.user_id = _user_id
        ))::integer,
        EXTRACT(DAY FROM AGE(CURRENT_DATE, a.birth_date))::integer
      )
    END as days_open,
    GREATEST(1, EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date))::integer - 1) as reproductive_years,
    COALESCE((
      SELECT COUNT(*)
      FROM animals offspring
      WHERE offspring.mother_id = a.id
        AND offspring.user_id = _user_id
        AND (_include_sold_dead OR offspring.status NOT IN ('sold', 'dead'))
    ), 0)::integer as total_offspring,
    COALESCE((
      SELECT COUNT(*)
      FROM artificial_inseminations ai
      WHERE ai.animal_id = a.id
        AND ai.user_id = _user_id
        AND ai.service_date >= _date_from
        AND ai.service_date <= _date_to
    ), 0)::integer as lifetime_services,
    COALESCE((
      SELECT COUNT(*)
      FROM pregnancies preg
      WHERE preg.animal_id = a.id
        AND preg.user_id = _user_id
        AND preg.pregnancy_date >= _date_from
        AND preg.pregnancy_date <= _date_to
    ), 0)::integer as lifetime_pregnancies,
    COALESCE((
      SELECT COUNT(*)
      FROM animals offspring
      WHERE offspring.mother_id = a.id
        AND offspring.user_id = _user_id
        AND offspring.birth_date >= _date_from
        AND offspring.birth_date <= _date_to
        AND (_include_sold_dead OR offspring.status NOT IN ('sold', 'dead'))
    ), 0)::integer as lifetime_calvings,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*)
        FROM artificial_inseminations ai
        WHERE ai.animal_id = a.id
          AND ai.user_id = _user_id
      ), 0) = 0 THEN 0
      ELSE ROUND(
        COALESCE((
          SELECT COUNT(*)
          FROM pregnancies preg
          WHERE preg.animal_id = a.id
            AND preg.user_id = _user_id
        ), 0)::numeric / NULLIF(COALESCE((
          SELECT COUNT(*)
          FROM artificial_inseminations ai
          WHERE ai.animal_id = a.id
            AND ai.user_id = _user_id
        ), 0)::numeric, 0) * 100, 2
      )
    END as individual_pregnancy_rate,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*)
        FROM pregnancies preg
        WHERE preg.animal_id = a.id
          AND preg.user_id = _user_id
      ), 0) = 0 THEN 0
      ELSE ROUND(
        COALESCE((
          SELECT COUNT(*)
          FROM animals offspring
          WHERE offspring.mother_id = a.id
            AND offspring.user_id = _user_id
            AND (_include_sold_dead OR offspring.status NOT IN ('sold', 'dead'))
        ), 0)::numeric / NULLIF(COALESCE((
          SELECT COUNT(*)
          FROM pregnancies preg
          WHERE preg.animal_id = a.id
            AND preg.user_id = _user_id
        ), 0)::numeric, 0) * 100, 2
      )
    END as individual_calving_rate,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*)
        FROM artificial_inseminations ai
        WHERE ai.animal_id = a.id
          AND ai.user_id = _user_id
      ), 0) >= 3 AND 
      ROUND(
        COALESCE((
          SELECT COUNT(*)
          FROM pregnancies preg
          WHERE preg.animal_id = a.id
            AND preg.user_id = _user_id
        ), 0)::numeric / NULLIF(COALESCE((
          SELECT COUNT(*)
          FROM artificial_inseminations ai
          WHERE ai.animal_id = a.id
            AND ai.user_id = _user_id
        ), 0)::numeric, 0) * 100, 2
      ) >= 60 THEN 'Alto'
      WHEN COALESCE((
        SELECT COUNT(*)
        FROM artificial_inseminations ai
        WHERE ai.animal_id = a.id
          AND ai.user_id = _user_id
      ), 0) >= 2 THEN 'Medio'
      ELSE 'Bajo'
    END as performance_level,
    COALESCE((
      SELECT COUNT(*)
      FROM reproductive_alerts ra
      WHERE ra.animal_id = a.id
        AND ra.status = 'pending'
    ), 0)::integer as active_alerts,
    COALESCE((
      SELECT ARRAY_AGG(DISTINCT ra.alert_type)
      FROM reproductive_alerts ra
      WHERE ra.animal_id = a.id
        AND ra.status = 'pending'
    ), ARRAY[]::text[]) as alert_types
  FROM animals a
  LEFT JOIN corrales c ON c.id = a.corral_id
  LEFT JOIN pregnancies p ON p.animal_id = a.id AND p.status = 'confirmed'
  WHERE a.user_id = _user_id
    AND a.sex = 'female'
    AND a.category IN ('vaquillona', 'vaca')
    AND (_include_sold_dead OR a.status NOT IN ('sold', 'dead'))
    AND (_corral_ids IS NULL OR a.corral_id = ANY(_corral_ids))
  ORDER BY a.tag;
END;
$$;