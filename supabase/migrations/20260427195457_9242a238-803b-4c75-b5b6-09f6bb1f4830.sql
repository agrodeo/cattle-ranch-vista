-- Generic animal activities
DROP POLICY IF EXISTS "Admins and employees can manage activities" ON public.activities;
DROP POLICY IF EXISTS "Admins and employees can update activities" ON public.activities;
DROP POLICY IF EXISTS "Admins and employees can delete activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view activities for their animals" ON public.activities;

CREATE POLICY "Users can view activities for their cabaña animals"
ON public.activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.animals a
    WHERE a.id = activities.animal_id
      AND public.current_user_is_active_in_cabana(a."cabaña_id")
  )
);

CREATE POLICY "Owner manager worker can create activities"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.animals a
    WHERE a.id = activities.animal_id
      AND public.current_user_is_active_in_cabana(a."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
);

CREATE POLICY "Owner manager worker can update activities"
ON public.activities
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.animals a
    WHERE a.id = activities.animal_id
      AND public.current_user_is_active_in_cabana(a."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.animals a
    WHERE a.id = activities.animal_id
      AND public.current_user_is_active_in_cabana(a."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
);

CREATE POLICY "Owner manager worker can delete activities"
ON public.activities
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.animals a
    WHERE a.id = activities.animal_id
      AND public.current_user_is_active_in_cabana(a."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
);

-- IA records
DROP POLICY IF EXISTS "Admins and employees can manage IA records" ON public.ia;
DROP POLICY IF EXISTS "Admins and employees can update IA records" ON public.ia;
DROP POLICY IF EXISTS "Admins and employees can delete IA records" ON public.ia;
DROP POLICY IF EXISTS "Users can view IA records for their cabaña" ON public.ia;

CREATE POLICY "Users can view IA records for their cabaña"
ON public.ia
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = ia.evento_id
      AND public.current_user_is_active_in_cabana(e."cabaña_id")
  )
);

CREATE POLICY "Owner manager worker can manage IA records"
ON public.ia
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = ia.evento_id
      AND public.current_user_is_active_in_cabana(e."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = ia.evento_id
      AND public.current_user_is_active_in_cabana(e."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
);

-- Tactos
DROP POLICY IF EXISTS "Admins and employees can manage tactos" ON public.tactos;
DROP POLICY IF EXISTS "Users can view tactos for their cabaña" ON public.tactos;

CREATE POLICY "Users can view tactos for their cabaña"
ON public.tactos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = tactos.evento_id
      AND public.current_user_is_active_in_cabana(e."cabaña_id")
  )
);

CREATE POLICY "Owner manager worker can manage tactos"
ON public.tactos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = tactos.evento_id
      AND public.current_user_is_active_in_cabana(e."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = tactos.evento_id
      AND public.current_user_is_active_in_cabana(e."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
);

-- Pregnancy records
DROP POLICY IF EXISTS "Admins and employees can manage preñeces" ON public."preñeces";
DROP POLICY IF EXISTS "Users can view preñeces for their cabaña" ON public."preñeces";

CREATE POLICY "Users can view preñeces for their cabaña"
ON public."preñeces"
FOR SELECT
TO authenticated
USING (public.current_user_is_active_in_cabana("cabaña_id"));

CREATE POLICY "Owner manager worker can manage preñeces"
ON public."preñeces"
FOR ALL
TO authenticated
USING (
  public.current_user_is_active_in_cabana("cabaña_id")
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
)
WITH CHECK (
  public.current_user_is_active_in_cabana("cabaña_id")
  AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])
  AND public.can_modify_data(auth.uid())
);

-- Reproductive cabaña-scoped tables
DROP POLICY IF EXISTS "Admins and employees can manage reproductive activities" ON public.reproductive_activities;
DROP POLICY IF EXISTS "Admins and employees can manage reproductive alerts" ON public.reproductive_alerts;
DROP POLICY IF EXISTS "Admins and employees can manage current reproductive state" ON public.reproductive_current_state;
DROP POLICY IF EXISTS "Admins and employees can manage reproductive_events" ON public.reproductive_events;
DROP POLICY IF EXISTS "Admins and employees can manage reproductive outcomes" ON public.reproductive_outcomes;
DROP POLICY IF EXISTS "Admins and employees can manage reproductive state history" ON public.reproductive_state_history;

CREATE POLICY "Owner manager worker can manage reproductive activities" ON public.reproductive_activities FOR ALL TO authenticated USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid())) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid()));
CREATE POLICY "Owner manager worker can manage reproductive alerts" ON public.reproductive_alerts FOR ALL TO authenticated USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid())) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid()));
CREATE POLICY "Owner manager worker can manage current reproductive state" ON public.reproductive_current_state FOR ALL TO authenticated USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid())) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid()));
CREATE POLICY "Owner manager worker can manage reproductive_events" ON public.reproductive_events FOR ALL TO authenticated USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid())) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid()));
CREATE POLICY "Owner manager worker can manage reproductive outcomes" ON public.reproductive_outcomes FOR ALL TO authenticated USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid())) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid()));
CREATE POLICY "Owner manager worker can manage reproductive state history" ON public.reproductive_state_history FOR ALL TO authenticated USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid())) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid()));