-- Fix the KPI function to show all reproductive females, not just those with activities
CREATE OR REPLACE FUNCTION public.calculate_reproductive_kpis(
  _cabana_id UUID,
  _date_from DATE DEFAULT NULL,
  _date_to DATE DEFAULT NULL,
  _corral_ids UUID[] DEFAULT NULL
) RETURNS TABLE(
  animal_id UUID,
  tag TEXT,
  name TEXT,
  category TEXT,
  corral_name TEXT,
  is_pregnant BOOLEAN,
  pregnancy_rate NUMERIC,
  calving_rate NUMERIC,
  total_services INTEGER,
  total_pregnancies INTEGER,
  successful_pregnancies INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set default date range if not provided
  IF _date_from IS NULL THEN
    _date_from := CURRENT_DATE - INTERVAL '365 days';
  END IF;
  IF _date_to IS NULL THEN
    _date_to := CURRENT_DATE;
  END IF;
  
  RETURN QUERY
  WITH reproductive_females AS (
    SELECT 
      a.id as animal_id,
      COALESCE(a.id_tag, 'Sin tag') as tag,
      COALESCE(a.name, '') as name,
      COALESCE(a.esta_preñada, false) as esta_preñada,
      COALESCE(c.name, 'Sin corral') as corral_name,
      CASE 
        WHEN a.birth_date IS NULL THEN 'Desconocido'
        WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) < 15 THEN 'Ternera'
        WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) < 36 THEN 'Vaquillona'
        ELSE 'Vaca'
      END as category
    FROM animals a
    LEFT JOIN corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = _cabana_id
      AND a.sex = 'Hembra'
      AND a.status NOT IN ('vendido', 'muerto')
      AND (a.birth_date IS NULL OR EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 15)
      AND (_corral_ids IS NULL OR a.corral_id = ANY(_corral_ids))
  ),
  activity_counts AS (
    SELECT 
      rf.animal_id,
      COALESCE(COUNT(CASE WHEN ra.tipo_actividad IN ('servicio', 'inseminacion_artificial') 
                          AND ra.fecha_actividad BETWEEN _date_from AND _date_to 
                         THEN 1 END), 0) as services_count,
      COALESCE(COUNT(CASE WHEN p.estado_final = 'activa' THEN 1 END), 0) as active_pregnancies,
      COALESCE(COUNT(CASE WHEN p.estado_final = 'exitosa' 
                          AND p.fecha_inicio BETWEEN _date_from AND _date_to 
                         THEN 1 END), 0) as successful_pregnancies,
      COALESCE(COUNT(CASE WHEN p.estado_final IN ('activa', 'exitosa', 'fallida') 
                          AND p.fecha_inicio BETWEEN _date_from AND _date_to 
                         THEN 1 END), 0) as total_pregnancies
    FROM reproductive_females rf
    LEFT JOIN reproductive_activities ra ON rf.animal_id = ra.animal_id
    LEFT JOIN preñeces p ON rf.animal_id = p.animal_id
    GROUP BY rf.animal_id
  )
  SELECT 
    rf.animal_id,
    rf.tag,
    rf.name,
    rf.category,
    rf.corral_name,
    rf.esta_preñada as is_pregnant,
    CASE 
      WHEN ac.services_count > 0 
      THEN ROUND((ac.total_pregnancies::NUMERIC / ac.services_count::NUMERIC) * 100, 1)
      ELSE 0 
    END as pregnancy_rate,
    CASE 
      WHEN ac.total_pregnancies > 0 
      THEN ROUND((ac.successful_pregnancies::NUMERIC / ac.total_pregnancies::NUMERIC) * 100, 1)
      ELSE 0 
    END as calving_rate,
    ac.services_count::INTEGER as total_services,
    ac.total_pregnancies::INTEGER,
    ac.successful_pregnancies::INTEGER
  FROM reproductive_females rf
  LEFT JOIN activity_counts ac ON rf.animal_id = ac.animal_id
  ORDER BY rf.tag;
END;
$$;