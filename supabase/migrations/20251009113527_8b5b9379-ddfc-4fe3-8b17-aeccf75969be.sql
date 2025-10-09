-- Fix temporal production analysis to show all weight types correctly
DROP FUNCTION IF EXISTS public.get_temporal_production_analysis(uuid, text, date, date, text, jsonb);

CREATE OR REPLACE FUNCTION public.get_temporal_production_analysis(
  _cabana_id uuid,
  _group_by text DEFAULT 'year',
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL,
  _tipo_pesaje text DEFAULT 'all',
  _filters jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  periodo text,
  year integer,
  periodo_orden integer,
  peso_nacimiento_promedio numeric,
  peso_destete_promedio numeric,
  peso_final_promedio numeric,
  adg_promedio numeric,
  cantidad_animales bigint,
  cantidad_pesajes bigint,
  mejora_vs_anterior numeric,
  percentil_25 numeric,
  percentil_75 numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  date_from_filter date := COALESCE(_date_from, CURRENT_DATE - INTERVAL '10 years');
  date_to_filter date := COALESCE(_date_to, CURRENT_DATE);
  corral_ids_filter uuid[];
  category_filter text := _filters->>'category';
  breed_filter text := _filters->>'breed';
BEGIN
  -- Parse corral_ids array
  IF _filters->'corral_ids' IS NOT NULL AND jsonb_typeof(_filters->'corral_ids') = 'array' THEN
    corral_ids_filter := ARRAY(SELECT jsonb_array_elements_text(_filters->'corral_ids'))::uuid[];
  END IF;

  RETURN QUERY
  WITH filtered_animals AS (
    SELECT a.id, a.birth_date, a.sex
    FROM animals a
    WHERE a.cabaña_id = _cabana_id
      AND a.status NOT IN ('vendido', 'muerto')
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
      AND (category_filter IS NULL OR categorize_animal(a.birth_date, a.sex) = category_filter)
      AND (breed_filter IS NULL OR a.breed = breed_filter)
  ),
  weight_data AS (
    SELECT 
      awh.*,
      fa.sex,
      CASE 
        WHEN _group_by = 'year' THEN EXTRACT(YEAR FROM awh.fecha)::text
        WHEN _group_by = 'semester' THEN EXTRACT(YEAR FROM awh.fecha)::text || '-S' || 
          CASE WHEN EXTRACT(MONTH FROM awh.fecha) <= 6 THEN '1' ELSE '2' END
        WHEN _group_by = 'quarter' THEN EXTRACT(YEAR FROM awh.fecha)::text || '-Q' || 
          EXTRACT(QUARTER FROM awh.fecha)::text
        WHEN _group_by = 'month' THEN TO_CHAR(awh.fecha, 'YYYY-MM')
        ELSE EXTRACT(YEAR FROM awh.fecha)::text
      END as periodo_text,
      EXTRACT(YEAR FROM awh.fecha)::integer as year_num,
      CASE 
        WHEN _group_by = 'year' THEN EXTRACT(YEAR FROM awh.fecha)::integer
        WHEN _group_by = 'semester' THEN (EXTRACT(YEAR FROM awh.fecha)::integer * 10) + 
          CASE WHEN EXTRACT(MONTH FROM awh.fecha) <= 6 THEN 1 ELSE 2 END
        WHEN _group_by = 'quarter' THEN (EXTRACT(YEAR FROM awh.fecha)::integer * 10) + 
          EXTRACT(QUARTER FROM awh.fecha)::integer
        WHEN _group_by = 'month' THEN (EXTRACT(YEAR FROM awh.fecha)::integer * 100) + 
          EXTRACT(MONTH FROM awh.fecha)::integer
        ELSE EXTRACT(YEAR FROM awh.fecha)::integer
      END as periodo_order
    FROM animal_weight_history awh
    JOIN filtered_animals fa ON awh.animal_id = fa.id
    WHERE awh.cabaña_id = _cabana_id
      AND awh.fecha BETWEEN date_from_filter AND date_to_filter
  ),
  period_stats AS (
    SELECT 
      wd.periodo_text,
      wd.year_num,
      wd.periodo_order,
      ROUND(AVG(CASE WHEN wd.tipo_pesaje = 'nacimiento' THEN wd.peso_kg END)::numeric, 2) as peso_nacimiento,
      ROUND(AVG(CASE WHEN wd.tipo_pesaje = 'destete' THEN wd.peso_kg END)::numeric, 2) as peso_destete,
      ROUND(AVG(CASE WHEN wd.tipo_pesaje = 'final' THEN wd.peso_kg END)::numeric, 2) as peso_final,
      ROUND(AVG(wd.ganancia_diaria)::numeric, 3) as adg_avg,
      COUNT(DISTINCT wd.animal_id) as animal_count,
      COUNT(*) as weight_count,
      PERCENTILE_CONT(0.25) WITHIN GROUP (
        ORDER BY CASE 
          WHEN _tipo_pesaje = 'destete' AND wd.tipo_pesaje = 'destete' THEN wd.peso_kg
          WHEN _tipo_pesaje = 'final' AND wd.tipo_pesaje = 'final' THEN wd.peso_kg
          WHEN _tipo_pesaje = 'all' THEN wd.peso_kg
          ELSE NULL
        END
      ) as p25_raw,
      PERCENTILE_CONT(0.75) WITHIN GROUP (
        ORDER BY CASE 
          WHEN _tipo_pesaje = 'destete' AND wd.tipo_pesaje = 'destete' THEN wd.peso_kg
          WHEN _tipo_pesaje = 'final' AND wd.tipo_pesaje = 'final' THEN wd.peso_kg
          WHEN _tipo_pesaje = 'all' THEN wd.peso_kg
          ELSE NULL
        END
      ) as p75_raw
    FROM weight_data wd
    GROUP BY wd.periodo_text, wd.year_num, wd.periodo_order
  ),
  with_comparison AS (
    SELECT 
      ps.*,
      LAG(
        CASE 
          WHEN _tipo_pesaje = 'destete' THEN ps.peso_destete
          WHEN _tipo_pesaje = 'final' THEN ps.peso_final
          ELSE COALESCE(ps.peso_destete, ps.peso_final)
        END
      ) OVER (ORDER BY ps.periodo_order) as prev_peso
    FROM period_stats ps
  )
  SELECT 
    wc.periodo_text as periodo,
    wc.year_num as year,
    wc.periodo_order as periodo_orden,
    wc.peso_nacimiento as peso_nacimiento_promedio,
    wc.peso_destete as peso_destete_promedio,
    wc.peso_final as peso_final_promedio,
    wc.adg_avg as adg_promedio,
    wc.animal_count as cantidad_animales,
    wc.weight_count as cantidad_pesajes,
    CASE 
      WHEN wc.prev_peso IS NOT NULL AND wc.prev_peso > 0 THEN
        ROUND((
          (CASE 
            WHEN _tipo_pesaje = 'destete' THEN wc.peso_destete
            WHEN _tipo_pesaje = 'final' THEN wc.peso_final
            ELSE COALESCE(wc.peso_destete, wc.peso_final)
          END - wc.prev_peso) / wc.prev_peso * 100
        )::numeric, 2)
      ELSE NULL
    END as mejora_vs_anterior,
    ROUND(wc.p25_raw::numeric, 2) as percentil_25,
    ROUND(wc.p75_raw::numeric, 2) as percentil_75
  FROM with_comparison wc
  ORDER BY wc.periodo_order;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_temporal_production_analysis TO authenticated;