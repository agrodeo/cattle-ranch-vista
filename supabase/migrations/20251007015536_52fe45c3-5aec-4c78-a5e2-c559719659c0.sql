-- Drop and recreate rpc_report_production_animals with corrected ADG calculations
DROP FUNCTION IF EXISTS public.rpc_report_production_animals(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.rpc_report_production_animals(
  _user_id uuid, 
  filters_json jsonb DEFAULT '{}'::jsonb
)
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
  date_from_filter date := COALESCE((filters_json->>'date_from')::date, CURRENT_DATE - INTERVAL '365 days');
  date_to_filter date := COALESCE((filters_json->>'date_to')::date, CURRENT_DATE);
  corral_ids_filter uuid[];
  category_filter text := filters_json->>'category';
  breed_filter text := filters_json->>'breed';
BEGIN
  -- Get user's cabaña
  SELECT cabaña_id INTO cabana_uuid FROM public.users WHERE id = _user_id;
  IF cabana_uuid IS NULL THEN
    SELECT cabaña_id INTO cabana_uuid FROM public.profiles WHERE user_id = _user_id;
  END IF;
  
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;
  
  -- Parse corral_ids array only if not null
  IF filters_json->'corral_ids' IS NOT NULL AND jsonb_typeof(filters_json->'corral_ids') = 'array' THEN
    corral_ids_filter := ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids'))::uuid[];
  END IF;
  
  RETURN QUERY
  WITH eligible_animals AS (
    SELECT a.*,
           c.name as corral_name,
           public.categorize_animal(a.birth_date, a.sex) as animal_category
    FROM public.animals a
    LEFT JOIN public.corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = cabana_uuid
      AND (include_sold_dead OR LOWER(COALESCE(a.status, 'activo')) NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
      AND (category_filter IS NULL OR public.categorize_animal(a.birth_date, a.sex) = category_filter)
      AND (breed_filter IS NULL OR a.breed = breed_filter)
  ),
  weight_data AS (
    SELECT 
      ea.id as animal_id,
      ea.peso_actual_kg as last_weight,
      ea.fecha_ultimo_pesaje as last_weight_date,
      ea.peso_nacimiento as weight_birth,
      ea.peso_destete as weight_weaning,
      ea.peso_final as weight_final,
      (SELECT COUNT(*) FROM animal_weight_history awh 
       WHERE awh.animal_id = ea.id 
       AND awh.fecha BETWEEN date_from_filter AND date_to_filter) as weighs_count
    FROM eligible_animals ea
  ),
  adg_90d_calc AS (
    SELECT 
      ea.id as animal_id,
      CASE 
        WHEN COUNT(awh.id) >= 2 THEN
          ROUND(
            (MAX(awh.peso_kg) - MIN(awh.peso_kg)) / 
            NULLIF(EXTRACT(DAY FROM MAX(awh.fecha) - MIN(awh.fecha)), 0),
            3
          )
        ELSE NULL
      END as adg_90d_value
    FROM eligible_animals ea
    LEFT JOIN animal_weight_history awh ON awh.animal_id = ea.id
      AND awh.fecha >= CURRENT_DATE - INTERVAL '90 days'
      AND awh.fecha <= CURRENT_DATE
    GROUP BY ea.id
  ),
  adg_season_calc AS (
    SELECT 
      ea.id as animal_id,
      CASE 
        WHEN COUNT(awh.id) >= 2 THEN
          ROUND(
            (MAX(awh.peso_kg) - MIN(awh.peso_kg)) / 
            NULLIF(EXTRACT(DAY FROM MAX(awh.fecha) - MIN(awh.fecha)), 0),
            3
          )
        ELSE NULL
      END as adg_season_value
    FROM eligible_animals ea
    LEFT JOIN animal_weight_history awh ON awh.animal_id = ea.id
      AND awh.fecha BETWEEN date_from_filter AND date_to_filter
    GROUP BY ea.id
  ),
  combined_data AS (
    SELECT 
      wd.*,
      adg90.adg_90d_value,
      adgs.adg_season_value,
      CASE 
        WHEN wd.weight_weaning IS NOT NULL AND wd.weight_final IS NOT NULL 
        THEN (wd.weight_weaning + wd.weight_final) / 2
        ELSE NULL 
      END as weight_yearling
    FROM weight_data wd
    LEFT JOIN adg_90d_calc adg90 ON wd.animal_id = adg90.animal_id
    LEFT JOIN adg_season_calc adgs ON wd.animal_id = adgs.animal_id
  ),
  percentile_data AS (
    SELECT 
      cd.*,
      ea.animal_category,
      ea.id_tag,
      ea.name,
      ea.corral_id,
      ea.corral_name,
      CASE 
        WHEN cd.adg_season_value > 0 THEN
          PERCENT_RANK() OVER (
            PARTITION BY ea.animal_category 
            ORDER BY cd.adg_season_value
          ) * 100
        ELSE 0
      END as adg_percentile_calc
    FROM combined_data cd
    JOIN eligible_animals ea ON cd.animal_id = ea.id
  )
  SELECT 
    pd.animal_id,
    pd.id_tag as tag,
    pd.name,
    pd.animal_category as category,
    pd.corral_id,
    pd.corral_name,
    pd.last_weight as last_weight_kg,
    pd.last_weight_date,
    pd.adg_90d_value as adg_recent_90d,
    pd.adg_season_value as adg_season,
    pd.weighs_count,
    pd.weight_birth,
    pd.weight_weaning,
    pd.weight_yearling,
    pd.weight_final,
    ROUND(pd.adg_percentile_calc)::integer as adg_percentile
  FROM percentile_data pd
  WHERE pd.last_weight IS NOT NULL OR pd.weighs_count > 0
  ORDER BY pd.adg_season_value DESC NULLS LAST, pd.id_tag;
END;
$function$;