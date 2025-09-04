-- Fix age calculation in rpc_corral_complete_kpis function
DROP FUNCTION IF EXISTS public.rpc_corral_complete_kpis(uuid);

CREATE OR REPLACE FUNCTION public.rpc_corral_complete_kpis(_user_id uuid)
 RETURNS TABLE(corral_id uuid, corral_name text, animal_count bigint, male_count bigint, female_count bigint, hectareas numeric, consanguinity_risk_count integer, highest_severity text, vaccination_percentage numeric, vaccination_alerts bigint, avg_daily_gain numeric, recent_weighings_count bigint, last_weighing_date date, vaccination_status text, pregnancy_rate numeric, avg_weight numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cabana_uuid uuid;
BEGIN
  -- Get user's cabaña using the correct column name
  SELECT cabana_id INTO cabana_uuid FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;
  
  RETURN QUERY
  WITH corral_animals AS (
    SELECT 
      c.id as corral_id,
      c.name as corral_name,
      c.hectareas,
      COUNT(a.id) as animal_count,
      COUNT(CASE WHEN a.sex = 'Macho' THEN 1 END) as male_count,
      COUNT(CASE WHEN a.sex = 'Hembra' THEN 1 END) as female_count,
      -- Count reproductive females (hembras >= 18 months old with valid birth dates)
      -- FIXED calculation: total months = years * 12 + months
      COUNT(CASE 
        WHEN a.sex = 'Hembra' 
        AND a.birth_date IS NOT NULL 
        AND a.birth_date <= CURRENT_DATE
        AND (EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))) >= 18
        THEN 1 
      END) as reproductive_females,
      -- Count pregnant females using current pregnancy status (only reproductive ones)
      COUNT(CASE 
        WHEN a.sex = 'Hembra' 
        AND a.esta_preñada = true 
        AND a.birth_date IS NOT NULL 
        AND a.birth_date <= CURRENT_DATE
        AND (EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))) >= 18
        THEN 1 
      END) as pregnant_count,
      AVG(CASE WHEN a.ganancia_diaria_kg IS NOT NULL THEN a.ganancia_diaria_kg END) as avg_daily_gain,
      AVG(CASE WHEN a.peso_actual_kg IS NOT NULL THEN a.peso_actual_kg END) as avg_weight,
      COUNT(CASE WHEN a.fecha_ultimo_pesaje >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as recent_weighings,
      MAX(a.fecha_ultimo_pesaje) as last_weighing_date
    FROM public.corrales c
    LEFT JOIN public.animals a ON c.id = a.corral_id 
      AND a.cabaña_id = cabana_uuid
      AND a.status NOT IN ('vendido', 'muerto', 'Vendido', 'Muerto')
    WHERE c.cabaña_id = cabana_uuid
    GROUP BY c.id, c.name, c.hectareas
  ),
  vaccination_stats AS (
    SELECT 
      ca.corral_id,
      COUNT(DISTINCT a.id) as total_animals_for_vac,
      COUNT(DISTINCT CASE 
        WHEN av.animal_id IS NOT NULL AND av.date >= CURRENT_DATE - INTERVAL '365 days' 
        THEN a.id 
      END) as vaccinated_animals,
      COUNT(CASE 
        WHEN av.next_due IS NOT NULL AND av.next_due <= CURRENT_DATE 
        THEN 1 
      END) as overdue_vaccines
    FROM corral_animals ca
    LEFT JOIN public.animals a ON ca.corral_id = a.corral_id
      AND a.cabaña_id = cabana_uuid  
      AND a.status NOT IN ('vendido', 'muerto', 'Vendido', 'Muerto')
    LEFT JOIN public.animal_vaccines av ON a.id = av.animal_id
    GROUP BY ca.corral_id
  )
  SELECT 
    ca.corral_id,
    ca.corral_name,
    ca.animal_count,
    ca.male_count,
    ca.female_count,
    ca.hectareas,
    0 as consanguinity_risk_count,
    null::text as highest_severity,
    CASE 
      WHEN vs.total_animals_for_vac > 0 THEN 
        ROUND((vs.vaccinated_animals::numeric / vs.total_animals_for_vac::numeric) * 100, 1)
      ELSE 0 
    END as vaccination_percentage,
    COALESCE(vs.overdue_vaccines, 0) as vaccination_alerts,
    ROUND(COALESCE(ca.avg_daily_gain, 0), 3) as avg_daily_gain,
    ca.recent_weighings as recent_weighings_count,
    ca.last_weighing_date,
    CASE 
      WHEN vs.total_animals_for_vac = 0 THEN 'unknown'
      WHEN (vs.vaccinated_animals::numeric / vs.total_animals_for_vac::numeric) >= 0.9 THEN 'excellent'
      WHEN (vs.vaccinated_animals::numeric / vs.total_animals_for_vac::numeric) >= 0.7 THEN 'good'
      WHEN (vs.vaccinated_animals::numeric / vs.total_animals_for_vac::numeric) >= 0.5 THEN 'warning'
      ELSE 'critical'
    END as vaccination_status,
    -- Pregnancy rate: pregnant reproductive females / total reproductive females
    CASE 
      WHEN ca.reproductive_females > 0 THEN 
        ROUND((ca.pregnant_count::numeric / ca.reproductive_females::numeric) * 100, 1)
      ELSE 0 
    END as pregnancy_rate,
    ROUND(COALESCE(ca.avg_weight, 0), 1) as avg_weight
  FROM corral_animals ca
  LEFT JOIN vaccination_stats vs ON ca.corral_id = vs.corral_id
  WHERE ca.animal_count > 0
  ORDER BY ca.corral_name;
END;
$function$;