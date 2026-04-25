CREATE OR REPLACE FUNCTION public.rpc_report_production_animals(_user_id uuid, filters_json jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(
  animal_id uuid,
  tag text,
  name text,
  category text,
  corral_id uuid,
  corral_name text,
  last_weight_kg numeric,
  last_weight_date date,
  adg_recent_90d numeric,
  adg_season numeric,
  weighs_count bigint,
  weight_birth numeric,
  weight_weaning numeric,
  weight_yearling numeric,
  weight_final numeric,
  adg_percentile integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
  include_sold_dead boolean := COALESCE((filters_json->>'include_sold_dead')::boolean, false);
  date_from_filter date := COALESCE(NULLIF(filters_json->>'date_from', '')::date, CURRENT_DATE - INTERVAL '365 days');
  date_to_filter date := COALESCE(NULLIF(filters_json->>'date_to', '')::date, CURRENT_DATE);
  corral_ids_filter uuid[];
  category_filter text := NULLIF(filters_json->>'category', '');
  breed_filter text := NULLIF(filters_json->>'breed', '');
BEGIN
  SELECT p.cabaña_id INTO cabana_uuid
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  IF cabana_uuid IS NULL THEN
    SELECT u.cabaña_id INTO cabana_uuid
    FROM public.users u
    WHERE u.id = _user_id
    LIMIT 1;
  END IF;

  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;

  IF filters_json->'corral_ids' IS NOT NULL
     AND jsonb_typeof(filters_json->'corral_ids') = 'array'
     AND jsonb_array_length(filters_json->'corral_ids') > 0 THEN
    corral_ids_filter := ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids'))::uuid[];
  END IF;

  RETURN QUERY
  WITH eligible_animals AS (
    SELECT
      a.*,
      c.name AS corral_name,
      public.categorize_animal(a.birth_date, a.sex) AS animal_category
    FROM public.animals a
    LEFT JOIN public.corrales c ON c.id = a.corral_id
    WHERE a.cabaña_id = cabana_uuid
      AND (include_sold_dead OR LOWER(COALESCE(a.status, 'activo')) NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
      AND (category_filter IS NULL OR public.categorize_animal(a.birth_date, a.sex) = category_filter)
      AND (breed_filter IS NULL OR a.breed = breed_filter)
  ),
  latest_history AS (
    SELECT DISTINCT ON (awh.animal_id)
      awh.animal_id,
      awh.peso_kg,
      awh.fecha
    FROM public.animal_weight_history awh
    WHERE awh.cabaña_id = cabana_uuid
    ORDER BY awh.animal_id, awh.fecha DESC, awh.created_at DESC
  ),
  history_summary AS (
    SELECT
      awh.animal_id,
      COUNT(*)::bigint AS total_weighs_count,
      COUNT(*) FILTER (WHERE awh.fecha BETWEEN date_from_filter AND date_to_filter)::bigint AS period_weighs_count,
      MAX(awh.peso_kg) FILTER (WHERE awh.tipo_pesaje = 'nacimiento') AS history_birth,
      MAX(awh.peso_kg) FILTER (WHERE awh.tipo_pesaje = 'destete') AS history_weaning,
      MAX(awh.peso_kg) FILTER (WHERE awh.tipo_pesaje = 'final') AS history_final
    FROM public.animal_weight_history awh
    WHERE awh.cabaña_id = cabana_uuid
    GROUP BY awh.animal_id
  ),
  adg_period AS (
    SELECT
      pairs.animal_id,
      ROUND((pairs.last_weight - pairs.first_weight) / NULLIF((pairs.last_date - pairs.first_date)::numeric, 0), 3) AS adg_value
    FROM (
      SELECT DISTINCT
        awh.animal_id,
        FIRST_VALUE(awh.peso_kg) OVER (PARTITION BY awh.animal_id ORDER BY awh.fecha ASC, awh.created_at ASC) AS first_weight,
        FIRST_VALUE(awh.fecha) OVER (PARTITION BY awh.animal_id ORDER BY awh.fecha ASC, awh.created_at ASC) AS first_date,
        FIRST_VALUE(awh.peso_kg) OVER (PARTITION BY awh.animal_id ORDER BY awh.fecha DESC, awh.created_at DESC) AS last_weight,
        FIRST_VALUE(awh.fecha) OVER (PARTITION BY awh.animal_id ORDER BY awh.fecha DESC, awh.created_at DESC) AS last_date,
        COUNT(*) OVER (PARTITION BY awh.animal_id) AS cnt
      FROM public.animal_weight_history awh
      WHERE awh.cabaña_id = cabana_uuid
        AND awh.fecha BETWEEN date_from_filter AND date_to_filter
    ) pairs
    WHERE pairs.cnt >= 2
  ),
  adg_all AS (
    SELECT
      pairs.animal_id,
      ROUND((pairs.last_weight - pairs.first_weight) / NULLIF((pairs.last_date - pairs.first_date)::numeric, 0), 3) AS adg_value
    FROM (
      SELECT DISTINCT
        awh.animal_id,
        FIRST_VALUE(awh.peso_kg) OVER (PARTITION BY awh.animal_id ORDER BY awh.fecha ASC, awh.created_at ASC) AS first_weight,
        FIRST_VALUE(awh.fecha) OVER (PARTITION BY awh.animal_id ORDER BY awh.fecha ASC, awh.created_at ASC) AS first_date,
        FIRST_VALUE(awh.peso_kg) OVER (PARTITION BY awh.animal_id ORDER BY awh.fecha DESC, awh.created_at DESC) AS last_weight,
        FIRST_VALUE(awh.fecha) OVER (PARTITION BY awh.animal_id ORDER BY awh.fecha DESC, awh.created_at DESC) AS last_date,
        COUNT(*) OVER (PARTITION BY awh.animal_id) AS cnt
      FROM public.animal_weight_history awh
      WHERE awh.cabaña_id = cabana_uuid
    ) pairs
    WHERE pairs.cnt >= 2
  ),
  combined_data AS (
    SELECT
      ea.id AS animal_id,
      ea.id_tag,
      ea.name,
      ea.animal_category,
      ea.corral_id,
      ea.corral_name,
      COALESCE(lh.peso_kg, ea.peso_actual_kg, ea.peso_final, ea.peso_destete, ea.peso_nacimiento) AS last_weight,
      COALESCE(lh.fecha, ea.fecha_ultimo_pesaje, ea.fecha_destete, ea.birth_date) AS last_weight_date,
      COALESCE(hs.total_weighs_count, 0)::bigint AS weighs_count,
      COALESCE(ea.peso_nacimiento, hs.history_birth) AS weight_birth,
      COALESCE(ea.peso_destete, hs.history_weaning) AS weight_weaning,
      COALESCE(ea.peso_final, hs.history_final) AS weight_final,
      CASE
        WHEN COALESCE(ea.peso_destete, hs.history_weaning) IS NOT NULL
          AND COALESCE(ea.peso_final, hs.history_final) IS NOT NULL
        THEN (COALESCE(ea.peso_destete, hs.history_weaning) + COALESCE(ea.peso_final, hs.history_final)) / 2
        ELSE NULL
      END AS weight_yearling,
      COALESCE(ap.adg_value, aa.adg_value, ea.ganancia_diaria_kg) AS adg_value
    FROM eligible_animals ea
    LEFT JOIN latest_history lh ON lh.animal_id = ea.id
    LEFT JOIN history_summary hs ON hs.animal_id = ea.id
    LEFT JOIN adg_period ap ON ap.animal_id = ea.id
    LEFT JOIN adg_all aa ON aa.animal_id = ea.id
  ),
  percentile_data AS (
    SELECT
      cd.*,
      CASE
        WHEN cd.adg_value > 0 THEN
          PERCENT_RANK() OVER (PARTITION BY cd.animal_category ORDER BY cd.adg_value) * 100
        ELSE 0
      END AS adg_percentile_calc
    FROM combined_data cd
  )
  SELECT
    pd.animal_id,
    pd.id_tag AS tag,
    pd.name,
    pd.animal_category AS category,
    pd.corral_id,
    pd.corral_name,
    pd.last_weight AS last_weight_kg,
    pd.last_weight_date,
    pd.adg_value AS adg_recent_90d,
    pd.adg_value AS adg_season,
    pd.weighs_count,
    pd.weight_birth,
    pd.weight_weaning,
    pd.weight_yearling,
    pd.weight_final,
    ROUND(pd.adg_percentile_calc)::integer AS adg_percentile
  FROM percentile_data pd
  WHERE pd.last_weight IS NOT NULL OR pd.weighs_count > 0
  ORDER BY pd.adg_value DESC NULLS LAST, pd.id_tag;
END;
$function$;