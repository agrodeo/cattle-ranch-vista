-- Create comprehensive reproductive state management system

-- Drop existing reproductive tables that will be replaced
DROP TABLE IF EXISTS public.reproductive_states CASCADE;
DROP TABLE IF EXISTS public.reproductive_kpis CASCADE;

-- Create reproductive state history table
CREATE TABLE public.reproductive_state_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  fecha_cambio DATE NOT NULL DEFAULT CURRENT_DATE,
  actividad_origen_id UUID, -- Link to the activity that caused this change
  evento_origen_id UUID, -- Link to the event that caused this change
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create current reproductive states table (one record per animal)
CREATE TABLE public.reproductive_current_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL UNIQUE,
  cabaña_id UUID NOT NULL,
  estado_actual TEXT NOT NULL DEFAULT 'sin_actividad',
  fecha_ultimo_cambio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_servicio DATE, -- When service/IA was performed
  fecha_deteccion_preñez DATE, -- When pregnancy was detected
  fecha_esperada_parto DATE, -- Expected calving date
  tipo_servicio TEXT, -- 'servicio' or 'inseminacion_artificial'
  evento_servicio_id UUID, -- Reference to the service event
  evento_deteccion_id UUID, -- Reference to the pregnancy detection event
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reproductive outcomes table (for completed pregnancies)
CREATE TABLE public.reproductive_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL,
  cabaña_id UUID NOT NULL,
  tipo_outcome TEXT NOT NULL, -- 'exitoso_servicio', 'exitoso_ia', 'exitoso_activa', 'perdida', 'fallido_servicio', 'fallido_ia'
  fecha_servicio DATE,
  fecha_deteccion_preñez DATE,
  fecha_outcome DATE NOT NULL,
  cria_id UUID, -- If successful, link to offspring
  dias_gestacion INTEGER,
  evento_origen_id UUID,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create individual reproductive KPIs table
CREATE TABLE public.individual_reproductive_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL UNIQUE,
  cabaña_id UUID NOT NULL,
  total_servicios INTEGER NOT NULL DEFAULT 0,
  total_inseminaciones INTEGER NOT NULL DEFAULT 0,
  total_preñeces_detectadas INTEGER NOT NULL DEFAULT 0,
  total_partos_exitosos INTEGER NOT NULL DEFAULT 0,
  total_preñeces_perdidas INTEGER NOT NULL DEFAULT 0,
  total_servicios_fallidos INTEGER NOT NULL DEFAULT 0,
  total_ias_fallidas INTEGER NOT NULL DEFAULT 0,
  porcentaje_preñez NUMERIC(5,2) NOT NULL DEFAULT 0,
  porcentaje_paricion NUMERIC(5,2) NOT NULL DEFAULT 0,
  años_reproductivos NUMERIC(4,2) NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_reproductive_state_history_animal ON public.reproductive_state_history(animal_id);
CREATE INDEX idx_reproductive_state_history_cabana ON public.reproductive_state_history(cabaña_id);
CREATE INDEX idx_reproductive_current_state_animal ON public.reproductive_current_state(animal_id);
CREATE INDEX idx_reproductive_current_state_cabana ON public.reproductive_current_state(cabaña_id);
CREATE INDEX idx_reproductive_outcomes_animal ON public.reproductive_outcomes(animal_id);
CREATE INDEX idx_reproductive_outcomes_cabana ON public.reproductive_outcomes(cabaña_id);
CREATE INDEX idx_individual_reproductive_kpis_animal ON public.individual_reproductive_kpis(animal_id);
CREATE INDEX idx_individual_reproductive_kpis_cabana ON public.individual_reproductive_kpis(cabaña_id);

-- Add RLS policies
ALTER TABLE public.reproductive_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproductive_current_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproductive_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_reproductive_kpis ENABLE ROW LEVEL SECURITY;

-- RLS policies for reproductive_state_history
CREATE POLICY "Users can view reproductive state history for their cabaña"
ON public.reproductive_state_history FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage reproductive state history"
ON public.reproductive_state_history FOR ALL
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id());

-- RLS policies for reproductive_current_state
CREATE POLICY "Users can view current reproductive state for their cabaña"
ON public.reproductive_current_state FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage current reproductive state"
ON public.reproductive_current_state FOR ALL
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id());

-- RLS policies for reproductive_outcomes
CREATE POLICY "Users can view reproductive outcomes for their cabaña"
ON public.reproductive_outcomes FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage reproductive outcomes"
ON public.reproductive_outcomes FOR ALL
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id());

-- RLS policies for individual_reproductive_kpis
CREATE POLICY "Users can view individual reproductive KPIs for their cabaña"
ON public.individual_reproductive_kpis FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage individual reproductive KPIs"
ON public.individual_reproductive_kpis FOR ALL
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id());

-- Add triggers for updated_at
CREATE TRIGGER update_reproductive_state_history_updated_at
  BEFORE UPDATE ON public.reproductive_state_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reproductive_current_state_updated_at
  BEFORE UPDATE ON public.reproductive_current_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_individual_reproductive_kpis_updated_at
  BEFORE UPDATE ON public.individual_reproductive_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();