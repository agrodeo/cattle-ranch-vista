-- Add missing RLS policies for critical tables

-- Add policies for animals table
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view animals for their cabaña"
  ON public.animals FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage animals for their cabaña"
  ON public.animals FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

-- Add policies for activities table  
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for their animals"
  ON public.activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = animal_id AND a.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can manage activities"
  ON public.activities FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = animal_id AND a.cabaña_id = get_current_user_cabana_id()
  ))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = animal_id AND a.cabaña_id = get_current_user_cabana_id()
  ));

-- Add policies for ia table
ALTER TABLE public.ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view IA records for their cabaña"
  ON public.ia FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can manage IA records"
  ON public.ia FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

-- Add policies for vacunaciones table
ALTER TABLE public.vacunaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vaccination records for their cabaña"
  ON public.vacunaciones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can manage vaccination records"
  ON public.vacunaciones FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

-- Add policies for eventos table
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their cabaña"
  ON public.eventos FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage events for their cabaña"
  ON public.eventos FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

-- Add policies for vacunas_historial table
ALTER TABLE public.vacunas_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vaccine history for their cabaña"
  ON public.vacunas_historial FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage vaccine history"
  ON public.vacunas_historial FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

-- Add policies for tactos table
ALTER TABLE public.tactos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tacto records for their cabaña"
  ON public.tactos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can manage tacto records"
  ON public.tactos FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

-- Add policies for preñeces table
ALTER TABLE public.preñeces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pregnancies for their cabaña"
  ON public.preñeces FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage pregnancies"
  ON public.preñeces FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

-- Add policies for pesajes table
ALTER TABLE public.pesajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weighing records for their cabaña"
  ON public.pesajes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can manage weighing records"
  ON public.pesajes FOR ALL
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

-- Create the missing user_roles table and has_role function that are referenced above
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'employee', 'viewer');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create the has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;