-- Create reproductive annual metrics table
CREATE TABLE public.reproductive_annual_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  year INTEGER NOT NULL,
  services_count INTEGER DEFAULT 0,
  pregnancies_count INTEGER DEFAULT 0,
  calvings_count INTEGER DEFAULT 0,
  pregnancy_rate NUMERIC DEFAULT 0,
  calving_rate NUMERIC DEFAULT 0,
  days_open_total INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(animal_id, year)
);

-- Create reproductive alerts table
CREATE TABLE public.reproductive_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('overdue_calving', 'low_performance', 'no_service', 'repeater')),
  alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  days_overdue INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reproductive active years table
CREATE TABLE public.reproductive_active_years (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  year INTEGER NOT NULL,
  started_at_18_months BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  pregnancy_detected BOOLEAN DEFAULT false,
  calving_occurred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(animal_id, year)
);

-- Enable RLS
ALTER TABLE public.reproductive_annual_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproductive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproductive_active_years ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reproductive_annual_metrics
CREATE POLICY "Users can view reproductive metrics for their cabaña"
  ON public.reproductive_annual_metrics FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage reproductive metrics"
  ON public.reproductive_annual_metrics FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

-- RLS Policies for reproductive_alerts
CREATE POLICY "Users can view reproductive alerts for their cabaña"
  ON public.reproductive_alerts FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage reproductive alerts"
  ON public.reproductive_alerts FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

-- RLS Policies for reproductive_active_years
CREATE POLICY "Users can view reproductive active years for their cabaña"
  ON public.reproductive_active_years FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = reproductive_active_years.animal_id 
    AND a.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can manage reproductive active years"
  ON public.reproductive_active_years FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = reproductive_active_years.animal_id 
    AND a.cabaña_id = get_current_user_cabana_id()
  ))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = reproductive_active_years.animal_id 
    AND a.cabaña_id = get_current_user_cabana_id()
  ));

-- Function to update reproductive metrics
CREATE OR REPLACE FUNCTION public.update_reproductive_metrics(
  _animal_id UUID,
  _year INTEGER,
  _increment_services INTEGER DEFAULT 0,
  _increment_pregnancies INTEGER DEFAULT 0,
  _increment_calvings INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  _cabana_id UUID;
  current_metrics RECORD;
BEGIN
  -- Get animal's cabaña
  SELECT cabaña_id INTO _cabana_id FROM public.animals WHERE id = _animal_id;
  
  IF _cabana_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get or create metrics record for the year
  INSERT INTO public.reproductive_annual_metrics (animal_id, cabaña_id, year)
  VALUES (_animal_id, _cabana_id, _year)
  ON CONFLICT (animal_id, year) DO NOTHING;
  
  -- Update counts
  UPDATE public.reproductive_annual_metrics 
  SET 
    services_count = services_count + _increment_services,
    pregnancies_count = pregnancies_count + _increment_pregnancies,
    calvings_count = calvings_count + _increment_calvings,
    updated_at = now()
  WHERE animal_id = _animal_id AND year = _year;
  
  -- Recalculate rates
  SELECT * INTO current_metrics 
  FROM public.reproductive_annual_metrics 
  WHERE animal_id = _animal_id AND year = _year;
  
  UPDATE public.reproductive_annual_metrics 
  SET 
    pregnancy_rate = CASE 
      WHEN current_metrics.services_count > 0 
      THEN ROUND((current_metrics.pregnancies_count::NUMERIC / current_metrics.services_count::NUMERIC) * 100, 1)
      ELSE 0 
    END,
    calving_rate = CASE 
      WHEN current_metrics.pregnancies_count > 0 
      THEN ROUND((current_metrics.calvings_count::NUMERIC / current_metrics.pregnancies_count::NUMERIC) * 100, 1)
      ELSE 0 
    END
  WHERE animal_id = _animal_id AND year = _year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and create reproductive alerts
CREATE OR REPLACE FUNCTION public.check_reproductive_alerts() RETURNS VOID AS $$
DECLARE
  animal_record RECORD;
  alert_exists BOOLEAN;
BEGIN
  -- Check for overdue calving alerts
  FOR animal_record IN
    SELECT a.id, a.cabaña_id, a.fecha_probable_parto, a.esta_preñada
    FROM public.animals a
    WHERE a.esta_preñada = true
      AND a.fecha_probable_parto IS NOT NULL
      AND a.fecha_probable_parto + INTERVAL '30 days' < CURRENT_DATE
      AND a.status NOT IN ('vendido', 'muerto')
  LOOP
    -- Check if alert already exists
    SELECT EXISTS (
      SELECT 1 FROM public.reproductive_alerts 
      WHERE animal_id = animal_record.id 
        AND alert_type = 'overdue_calving' 
        AND status = 'pending'
    ) INTO alert_exists;
    
    IF NOT alert_exists THEN
      INSERT INTO public.reproductive_alerts (
        animal_id, cabaña_id, alert_type, expected_date, days_overdue
      ) VALUES (
        animal_record.id,
        animal_record.cabaña_id,
        'overdue_calving',
        animal_record.fecha_probable_parto,
        CURRENT_DATE - animal_record.fecha_probable_parto
      );
    ELSE
      -- Update days overdue
      UPDATE public.reproductive_alerts 
      SET days_overdue = CURRENT_DATE - animal_record.fecha_probable_parto,
          updated_at = now()
      WHERE animal_id = animal_record.id 
        AND alert_type = 'overdue_calving' 
        AND status = 'pending';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RPC function for detailed reproductive metrics
CREATE OR REPLACE FUNCTION public.rpc_reproductive_detailed_metrics(_user_id UUID, filters_json JSONB DEFAULT '{}'::jsonb)
RETURNS TABLE(
  animal_id UUID,
  tag TEXT,
  name TEXT,
  age_months INTEGER,
  category TEXT,
  corral_id UUID,
  corral_name TEXT,
  is_pregnant BOOLEAN,
  pregnancy_date DATE,
  expected_calving_date DATE,
  last_service_date DATE,
  days_open INTEGER,
  reproductive_years INTEGER,
  total_offspring INTEGER,
  lifetime_services INTEGER,
  lifetime_pregnancies INTEGER,
  lifetime_calvings INTEGER,
  individual_pregnancy_rate NUMERIC,
  individual_calving_rate NUMERIC,
  performance_level TEXT,
  active_alerts INTEGER,
  alert_types TEXT[]
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cabana_uuid UUID;
  include_sold_dead BOOLEAN := COALESCE((filters_json->>'include_sold_dead')::boolean, false);
  corral_ids_filter UUID[] := ARRAY(SELECT jsonb_array_elements_text(filters_json->'corral_ids'))::uuid[];
  performance_filter TEXT := filters_json->>'performance';
  alert_filter TEXT := filters_json->>'alert_status';
BEGIN
  -- Get user's cabaña
  SELECT cabana_id INTO cabana_uuid FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cabana_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña assigned';
  END IF;
  
  RETURN QUERY
  WITH eligible_females AS (
    SELECT 
      a.id,
      a.id_tag,
      a.name,
      a.corral_id,
      a.esta_preñada,
      a.fecha_ultima_preñez,
      a.fecha_probable_parto,
      a.birth_date,
      c.name as corral_name,
      public.categorize_animal(a.birth_date, a.sex) as animal_category,
      CASE 
        WHEN a.birth_date IS NOT NULL AND a.birth_date <= CURRENT_DATE 
        THEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date))::integer
        ELSE NULL 
      END as age_in_months,
      -- Calculate reproductive years (from 18 months)
      CASE 
        WHEN a.birth_date IS NOT NULL AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 18
        THEN GREATEST(1, EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date + INTERVAL '18 months'))::integer)
        ELSE 0
      END as reproductive_years_calc
    FROM public.animals a
    LEFT JOIN public.corrales c ON a.corral_id = c.id
    WHERE a.cabaña_id = cabana_uuid
      AND a.sex = 'Hembra'
      AND (
        a.birth_date IS NULL 
        OR (a.birth_date <= CURRENT_DATE AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= 18)
      ) -- At least 18 months old
      AND (include_sold_dead OR a.status NOT IN ('vendido', 'muerto'))
      AND (corral_ids_filter IS NULL OR a.corral_id = ANY(corral_ids_filter))
  ),
  services_data AS (
    SELECT 
      unnest(ia.animales_ids) as animal_id,
      COUNT(*) as service_count,
      MAX(e.fecha) as last_service_date
    FROM public.ia 
    JOIN public.eventos e ON ia.evento_id = e.id
    WHERE e.cabaña_id = cabana_uuid
    GROUP BY unnest(ia.animales_ids)
  ),
  pregnancy_data AS (
    SELECT 
      (result_item->>'animal_id')::uuid as animal_id,
      COUNT(CASE WHEN result_item->>'resultado' = 'preñada' THEN 1 END) as pregnancy_count
    FROM (
      SELECT 
        jsonb_array_elements(tactos.resultados) as result_item
      FROM public.tactos
      JOIN public.eventos e ON tactos.evento_id = e.id
      WHERE e.cabaña_id = cabana_uuid
    ) sub
    WHERE (result_item->>'animal_id') IS NOT NULL
    GROUP BY (result_item->>'animal_id')::uuid
  ),
  offspring_data AS (
    SELECT 
      mother_id as animal_id,
      COUNT(*) as offspring_count
    FROM public.animals
    WHERE mother_id IS NOT NULL
      AND cabaña_id = cabana_uuid
    GROUP BY mother_id
  ),
  alerts_data AS (
    SELECT 
      animal_id,
      COUNT(*) as alert_count,
      array_agg(alert_type) as alert_types_array
    FROM public.reproductive_alerts
    WHERE status = 'pending'
      AND cabaña_id = cabana_uuid
    GROUP BY animal_id
  ),
  last_calving_data AS (
    SELECT 
      mother_id as animal_id,
      MAX(birth_date) as last_calving_date
    FROM public.animals
    WHERE mother_id IS NOT NULL
      AND cabaña_id = cabana_uuid
      AND birth_date IS NOT NULL
    GROUP BY mother_id
  )
  SELECT 
    ef.id as animal_id,
    ef.id_tag as tag,
    ef.name,
    ef.age_in_months,
    ef.animal_category as category,
    ef.corral_id,
    ef.corral_name,
    COALESCE(ef.esta_preñada, false) as is_pregnant,
    ef.fecha_ultima_preñez as pregnancy_date,
    ef.fecha_probable_parto as expected_calving_date,
    sd.last_service_date,
    CASE 
      WHEN lcd.last_calving_date IS NOT NULL 
      THEN (CURRENT_DATE - lcd.last_calving_date)::integer
      ELSE NULL 
    END as days_open,
    ef.reproductive_years_calc as reproductive_years,
    COALESCE(od.offspring_count, 0)::integer as total_offspring,
    COALESCE(sd.service_count, 0)::integer as lifetime_services,
    COALESCE(pd.pregnancy_count, 0)::integer as lifetime_pregnancies,
    COALESCE(od.offspring_count, 0)::integer as lifetime_calvings, -- Using offspring as proxy for calvings
    CASE 
      WHEN COALESCE(sd.service_count, 0) > 0 
      THEN ROUND((COALESCE(pd.pregnancy_count, 0)::NUMERIC / sd.service_count::NUMERIC) * 100, 1)
      ELSE 0 
    END as individual_pregnancy_rate,
    CASE 
      WHEN COALESCE(pd.pregnancy_count, 0) > 0 
      THEN ROUND((COALESCE(od.offspring_count, 0)::NUMERIC / pd.pregnancy_count::NUMERIC) * 100, 1)
      ELSE 0 
    END as individual_calving_rate,
    CASE 
      WHEN COALESCE(sd.service_count, 0) = 0 THEN 'Sin datos'
      WHEN (COALESCE(pd.pregnancy_count, 0)::NUMERIC / sd.service_count::NUMERIC) >= 0.8 THEN 'Excelente'
      WHEN (COALESCE(pd.pregnancy_count, 0)::NUMERIC / sd.service_count::NUMERIC) >= 0.6 THEN 'Bueno'
      WHEN (COALESCE(pd.pregnancy_count, 0)::NUMERIC / sd.service_count::NUMERIC) >= 0.4 THEN 'Regular'
      ELSE 'Bajo'
    END as performance_level,
    COALESCE(ad.alert_count, 0)::integer as active_alerts,
    COALESCE(ad.alert_types_array, ARRAY[]::text[]) as alert_types
  FROM eligible_females ef
  LEFT JOIN services_data sd ON ef.id = sd.animal_id
  LEFT JOIN pregnancy_data pd ON ef.id = pd.animal_id
  LEFT JOIN offspring_data od ON ef.id = od.animal_id
  LEFT JOIN alerts_data ad ON ef.id = ad.animal_id
  LEFT JOIN last_calving_data lcd ON ef.id = lcd.animal_id
  WHERE 
    (performance_filter IS NULL OR 
     CASE 
       WHEN COALESCE(sd.service_count, 0) = 0 THEN 'Sin datos'
       WHEN (COALESCE(pd.pregnancy_count, 0)::NUMERIC / sd.service_count::NUMERIC) >= 0.8 THEN 'Excelente'
       WHEN (COALESCE(pd.pregnancy_count, 0)::NUMERIC / sd.service_count::NUMERIC) >= 0.6 THEN 'Bueno'
       WHEN (COALESCE(pd.pregnancy_count, 0)::NUMERIC / sd.service_count::NUMERIC) >= 0.4 THEN 'Regular'
       ELSE 'Bajo'
     END = performance_filter)
    AND (alert_filter IS NULL OR 
         (alert_filter = 'with_alerts' AND COALESCE(ad.alert_count, 0) > 0) OR
         (alert_filter = 'no_alerts' AND COALESCE(ad.alert_count, 0) = 0))
  ORDER BY individual_pregnancy_rate DESC NULLS LAST, ef.id_tag;
END;
$$;

-- Update trigger to maintain reproductive metrics
CREATE OR REPLACE FUNCTION public.update_reproductive_metrics_trigger()
RETURNS TRIGGER AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- When pregnancy is detected via tacto
  IF TG_TABLE_NAME = 'tactos' THEN
    -- This will be handled by the existing tacto trigger
    RETURN NEW;
  END IF;
  
  -- When animal pregnancy status changes
  IF TG_TABLE_NAME = 'animals' AND OLD.esta_preñada IS DISTINCT FROM NEW.esta_preñada THEN
    IF NEW.esta_preñada = true AND OLD.esta_preñada = false THEN
      -- Pregnancy detected
      PERFORM public.update_reproductive_metrics(NEW.id, current_year, 0, 1, 0);
    END IF;
  END IF;
  
  -- When a new animal is born (calving event)
  IF TG_TABLE_NAME = 'animals' AND TG_OP = 'INSERT' AND NEW.mother_id IS NOT NULL THEN
    PERFORM public.update_reproductive_metrics(NEW.mother_id, current_year, 0, 0, 1);
    
    -- Update mother's pregnancy status
    UPDATE public.animals 
    SET esta_preñada = false, 
        fecha_probable_parto = NULL
    WHERE id = NEW.mother_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER update_reproductive_metrics_on_animal_changes
  AFTER INSERT OR UPDATE ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.update_reproductive_metrics_trigger();

-- Add updated_at triggers
CREATE TRIGGER update_reproductive_annual_metrics_updated_at
  BEFORE UPDATE ON public.reproductive_annual_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reproductive_alerts_updated_at
  BEFORE UPDATE ON public.reproductive_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reproductive_active_years_updated_at
  BEFORE UPDATE ON public.reproductive_active_years
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();