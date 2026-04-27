CREATE OR REPLACE FUNCTION public.get_corral_season_comparison(
  _cabana_id uuid,
  _date_from date DEFAULT (CURRENT_DATE - INTERVAL '5 years')::date,
  _date_to date DEFAULT CURRENT_DATE,
  _group_by text DEFAULT 'year',
  _min_days_in_corral int DEFAULT 60,
  _tipo_pesaje text[] DEFAULT ARRAY['destete', 'final', 'control'],
  _corral_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  corral_id uuid,
  corral_name text,
  season_label text,
  season_start date,
  season_end date,
  animal_count int,
  avg_peso_kg numeric,
  avg_peso_destete numeric,
  avg_peso_final numeric,
  avg_adg numeric,
  avg_adg_benchmark_pct numeric,
  breed_distribution jsonb,
  mejora_vs_anterior numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_active_in_cabana(_cabana_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  WITH seasons AS (
    SELECT
      s.label AS season_label,
      MIN(s.d)::date AS season_start,
      MAX(s.d)::date AS season_end
    FROM (
      SELECT
        d::date AS d,
        CASE _group_by
          WHEN 'semester' THEN TO_CHAR(d, 'YYYY') || '-S' || CASE WHEN EXTRACT(MONTH FROM d) <= 6 THEN '1' ELSE '2' END
          WHEN 'quarter' THEN TO_CHAR(d, 'YYYY') || '-Q' || EXTRACT(QUARTER FROM d)::text
          ELSE TO_CHAR(d, 'YYYY')
        END AS label
      FROM generate_series(_date_from::timestamp, _date_to::timestamp, '1 day'::interval) AS d
    ) s
    GROUP BY s.label
  ),
  weights_with_corral AS (
    SELECT
      wh.animal_id,
      wh.fecha,
      wh.peso_kg,
      wh.ganancia_diaria,
      wh.tipo_pesaje,
      COALESCE(NULLIF(a.breed, ''), 'Sin especificar') AS breed,
      COALESCE(
        (
          SELECT cm.corral_nuevo_id
          FROM public.corral_movements cm
          WHERE cm.animal_id = wh.animal_id
            AND cm.cabaña_id = _cabana_id
            AND cm.fecha_movimiento <= wh.fecha
            AND cm.corral_nuevo_id IS NOT NULL
          ORDER BY cm.fecha_movimiento DESC, cm.created_at DESC
          LIMIT 1
        ),
        a.corral_id
      ) AS corral_at_weighing
    FROM public.animal_weight_history wh
    JOIN public.animals a ON a.id = wh.animal_id
    WHERE wh.cabaña_id = _cabana_id
      AND wh.fecha BETWEEN _date_from AND _date_to
      AND wh.tipo_pesaje = ANY(_tipo_pesaje)
      AND wh.peso_kg > 0
  ),
  weights_in_season AS (
    SELECT wc.*, s.season_label, s.season_start, s.season_end
    FROM weights_with_corral wc
    JOIN seasons s ON wc.fecha BETWEEN s.season_start AND s.season_end
    WHERE wc.corral_at_weighing IS NOT NULL
  ),
  eligible_animal_corrals AS (
    SELECT
      wis.animal_id,
      wis.corral_at_weighing AS corral_id,
      wis.season_label,
      MIN(wis.fecha) AS first_weight_date,
      MAX(wis.fecha) AS last_weight_date,
      COUNT(*) AS weight_count
    FROM weights_in_season wis
    GROUP BY wis.animal_id, wis.corral_at_weighing, wis.season_label
    HAVING (MAX(wis.fecha) - MIN(wis.fecha)) >= _min_days_in_corral
       OR COUNT(*) >= 2
  ),
  breed_counts AS (
    SELECT
      wis.corral_at_weighing AS corral_id,
      wis.season_label,
      wis.breed,
      COUNT(DISTINCT wis.animal_id)::int AS breed_count
    FROM weights_in_season wis
    JOIN eligible_animal_corrals eac
      ON eac.animal_id = wis.animal_id
      AND eac.corral_id = wis.corral_at_weighing
      AND eac.season_label = wis.season_label
    GROUP BY wis.corral_at_weighing, wis.season_label, wis.breed
  ),
  aggregated AS (
    SELECT
      c.id AS corral_id,
      c.name AS corral_name,
      wis.season_label,
      wis.season_start,
      wis.season_end,
      COUNT(DISTINCT wis.animal_id)::int AS animal_count,
      ROUND(AVG(wis.peso_kg), 1) AS avg_peso_kg,
      ROUND(AVG(CASE WHEN wis.tipo_pesaje = 'destete' THEN wis.peso_kg END), 1) AS avg_peso_destete,
      ROUND(AVG(CASE WHEN wis.tipo_pesaje = 'final' THEN wis.peso_kg END), 1) AS avg_peso_final,
      ROUND(AVG(CASE WHEN wis.ganancia_diaria > 0 THEN wis.ganancia_diaria END), 3) AS avg_adg,
      COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('breed', bc.breed, 'count', bc.breed_count) ORDER BY bc.breed)
          FROM breed_counts bc
          WHERE bc.corral_id = c.id AND bc.season_label = wis.season_label
        ),
        '[]'::jsonb
      ) AS breed_distribution
    FROM public.corrales c
    JOIN weights_in_season wis ON wis.corral_at_weighing = c.id
    JOIN eligible_animal_corrals eac
      ON eac.animal_id = wis.animal_id
      AND eac.corral_id = c.id
      AND eac.season_label = wis.season_label
    WHERE c.cabaña_id = _cabana_id
      AND (_corral_ids IS NULL OR c.id = ANY(_corral_ids))
    GROUP BY c.id, c.name, wis.season_label, wis.season_start, wis.season_end
    HAVING COUNT(DISTINCT wis.animal_id) >= 1
  ),
  with_delta AS (
    SELECT
      a.*,
      ROUND(
        CASE
          WHEN LAG(a.avg_adg) OVER (PARTITION BY a.corral_id ORDER BY a.season_start) > 0
          THEN ((a.avg_adg - LAG(a.avg_adg) OVER (PARTITION BY a.corral_id ORDER BY a.season_start))
                / LAG(a.avg_adg) OVER (PARTITION BY a.corral_id ORDER BY a.season_start)) * 100
          ELSE NULL
        END,
        1
      ) AS mejora_vs_anterior
    FROM aggregated a
  )
  SELECT
    wd.corral_id,
    wd.corral_name,
    wd.season_label,
    wd.season_start,
    wd.season_end,
    wd.animal_count,
    wd.avg_peso_kg,
    wd.avg_peso_destete,
    wd.avg_peso_final,
    wd.avg_adg,
    NULL::numeric AS avg_adg_benchmark_pct,
    wd.breed_distribution,
    wd.mejora_vs_anterior
  FROM with_delta wd
  ORDER BY wd.corral_name, wd.season_start;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_corral_ranking(
  _cabana_id uuid,
  _date_from date DEFAULT (CURRENT_DATE - INTERVAL '1 year')::date,
  _date_to date DEFAULT CURRENT_DATE,
  _min_days_in_corral int DEFAULT 60,
  _metric text DEFAULT 'adg'
)
RETURNS TABLE (
  corral_id uuid,
  corral_name text,
  animal_count int,
  avg_adg numeric,
  avg_peso_destete numeric,
  avg_peso_final numeric,
  hectareas numeric,
  breed_mix text,
  rank_position int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_active_in_cabana(_cabana_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  WITH weights_with_corral AS (
    SELECT
      wh.animal_id,
      wh.fecha,
      wh.peso_kg,
      wh.ganancia_diaria,
      wh.tipo_pesaje,
      COALESCE(NULLIF(a.breed, ''), 'Sin especificar') AS breed,
      COALESCE(
        (
          SELECT cm.corral_nuevo_id
          FROM public.corral_movements cm
          WHERE cm.animal_id = wh.animal_id
            AND cm.cabaña_id = _cabana_id
            AND cm.fecha_movimiento <= wh.fecha
            AND cm.corral_nuevo_id IS NOT NULL
          ORDER BY cm.fecha_movimiento DESC, cm.created_at DESC
          LIMIT 1
        ),
        a.corral_id
      ) AS corral_at_weighing
    FROM public.animal_weight_history wh
    JOIN public.animals a ON a.id = wh.animal_id
    WHERE wh.cabaña_id = _cabana_id
      AND wh.fecha BETWEEN _date_from AND _date_to
      AND wh.peso_kg > 0
  ),
  eligible_animal_corrals AS (
    SELECT
      wc.animal_id,
      wc.corral_at_weighing AS corral_id,
      MIN(wc.fecha) AS first_weight_date,
      MAX(wc.fecha) AS last_weight_date,
      COUNT(*) AS weight_count
    FROM weights_with_corral wc
    WHERE wc.corral_at_weighing IS NOT NULL
    GROUP BY wc.animal_id, wc.corral_at_weighing
    HAVING (MAX(wc.fecha) - MIN(wc.fecha)) >= _min_days_in_corral
       OR COUNT(*) >= 2
  ),
  corral_stats AS (
    SELECT
      c.id AS corral_id,
      c.name AS corral_name,
      c.hectareas,
      COUNT(DISTINCT wc.animal_id)::int AS animal_count,
      ROUND(AVG(CASE WHEN wc.ganancia_diaria > 0 THEN wc.ganancia_diaria END), 3) AS avg_adg,
      ROUND(AVG(CASE WHEN wc.tipo_pesaje = 'destete' THEN wc.peso_kg END), 1) AS avg_peso_destete,
      ROUND(AVG(CASE WHEN wc.tipo_pesaje = 'final' THEN wc.peso_kg END), 1) AS avg_peso_final,
      STRING_AGG(DISTINCT wc.breed, ', ' ORDER BY wc.breed) AS breed_mix
    FROM public.corrales c
    JOIN weights_with_corral wc ON wc.corral_at_weighing = c.id
    JOIN eligible_animal_corrals eac ON eac.animal_id = wc.animal_id AND eac.corral_id = c.id
    WHERE c.cabaña_id = _cabana_id
    GROUP BY c.id, c.name, c.hectareas
    HAVING COUNT(DISTINCT wc.animal_id) >= 2
  )
  SELECT
    cs.corral_id,
    cs.corral_name,
    cs.animal_count,
    cs.avg_adg,
    cs.avg_peso_destete,
    cs.avg_peso_final,
    cs.hectareas,
    cs.breed_mix,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE _metric
          WHEN 'peso_destete' THEN cs.avg_peso_destete
          WHEN 'peso_final' THEN cs.avg_peso_final
          ELSE cs.avg_adg
        END DESC NULLS LAST
    )::int AS rank_position
  FROM corral_stats cs;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_corral_season_comparison(uuid, date, date, text, int, text[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_corral_ranking(uuid, date, date, int, text) TO authenticated;