-- Add missing RLS policies for all tables that currently have RLS enabled but no policies

-- Add policies for animals table
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view animals for their cabaña"
  ON public.animals FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage animals for their cabaña"
  ON public.animals FOR INSERT
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can update animals for their cabaña"
  ON public.animals FOR UPDATE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can delete animals for their cabaña"
  ON public.animals FOR DELETE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

-- Add policies for activities table  
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for their animals"
  ON public.activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = animal_id AND a.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can manage activities"
  ON public.activities FOR INSERT
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = animal_id AND a.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can update activities"
  ON public.activities FOR UPDATE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = animal_id AND a.cabaña_id = get_current_user_cabana_id()
  ))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.animals a 
    WHERE a.id = animal_id AND a.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can delete activities"
  ON public.activities FOR DELETE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
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
  ON public.ia FOR INSERT
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can update IA records"
  ON public.ia FOR UPDATE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can delete IA records"
  ON public.ia FOR DELETE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
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
  ON public.vacunaciones FOR INSERT
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can update vaccination records"
  ON public.vacunaciones FOR UPDATE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ))
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Admins and employees can delete vaccination records"
  ON public.vacunaciones FOR DELETE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND EXISTS (
    SELECT 1 FROM public.eventos e 
    WHERE e.id = evento_id AND e.cabaña_id = get_current_user_cabana_id()
  ));

-- Add policies for eventos table
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their cabaña"
  ON public.eventos FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage events for their cabaña"
  ON public.eventos FOR INSERT
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can update events for their cabaña"
  ON public.eventos FOR UPDATE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id())
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can delete events for their cabaña"
  ON public.eventos FOR DELETE
  USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());