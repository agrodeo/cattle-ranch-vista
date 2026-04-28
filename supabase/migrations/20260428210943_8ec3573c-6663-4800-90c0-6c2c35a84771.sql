DROP POLICY IF EXISTS "Writers can create task activities" ON public.activities;
DROP POLICY IF EXISTS "Writers and assignees can update task activities" ON public.activities;
DROP POLICY IF EXISTS "Writers can delete task activities" ON public.activities;

CREATE POLICY "Managers can create task activities"
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "cabaña_id" IS NOT NULL
    AND kind = 'task'
    AND current_user_is_active_in_cabana("cabaña_id")
    AND current_user_role_in(ARRAY['owner'::app_role, 'manager'::app_role, 'admin'::app_role])
    AND can_modify_data(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Managers and assignees can update task activities"
  ON public.activities
  FOR UPDATE
  TO authenticated
  USING (
    "cabaña_id" IS NOT NULL
    AND kind = 'task'
    AND current_user_is_active_in_cabana("cabaña_id")
    AND (
      (current_user_role_in(ARRAY['owner'::app_role, 'manager'::app_role, 'admin'::app_role]) AND can_modify_data(auth.uid()))
      OR assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    "cabaña_id" IS NOT NULL
    AND kind = 'task'
    AND current_user_is_active_in_cabana("cabaña_id")
    AND (
      (current_user_role_in(ARRAY['owner'::app_role, 'manager'::app_role, 'admin'::app_role]) AND can_modify_data(auth.uid()))
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY "Managers can delete task activities"
  ON public.activities
  FOR DELETE
  TO authenticated
  USING (
    "cabaña_id" IS NOT NULL
    AND kind = 'task'
    AND current_user_is_active_in_cabana("cabaña_id")
    AND current_user_role_in(ARRAY['owner'::app_role, 'manager'::app_role, 'admin'::app_role])
    AND can_modify_data(auth.uid())
  );