DROP POLICY IF EXISTS "Users can view events for their cabaña" ON public.eventos;
DROP POLICY IF EXISTS "Admins and employees can manage events for their cabaña" ON public.eventos;
DROP POLICY IF EXISTS "Admins and employees can update events for their cabaña" ON public.eventos;
DROP POLICY IF EXISTS "Admins and employees can delete events for their cabaña" ON public.eventos;

CREATE POLICY "Users can view events for their cabaña"
ON public.eventos
FOR SELECT
TO authenticated
USING (public.current_user_is_active_in_cabana("cabaña_id"));

CREATE POLICY "Owner manager worker can create events"
ON public.eventos
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_is_active_in_cabana("cabaña_id")
  AND public.current_user_role_in(ARRAY[
    'owner'::public.app_role,
    'manager'::public.app_role,
    'worker'::public.app_role,
    'admin'::public.app_role,
    'employee'::public.app_role
  ])
  AND public.can_modify_data(auth.uid())
);

CREATE POLICY "Owner manager worker can update events"
ON public.eventos
FOR UPDATE
TO authenticated
USING (
  public.current_user_is_active_in_cabana("cabaña_id")
  AND public.current_user_role_in(ARRAY[
    'owner'::public.app_role,
    'manager'::public.app_role,
    'worker'::public.app_role,
    'admin'::public.app_role,
    'employee'::public.app_role
  ])
  AND public.can_modify_data(auth.uid())
)
WITH CHECK (
  public.current_user_is_active_in_cabana("cabaña_id")
  AND public.current_user_role_in(ARRAY[
    'owner'::public.app_role,
    'manager'::public.app_role,
    'worker'::public.app_role,
    'admin'::public.app_role,
    'employee'::public.app_role
  ])
  AND public.can_modify_data(auth.uid())
);

CREATE POLICY "Owner manager worker can delete events"
ON public.eventos
FOR DELETE
TO authenticated
USING (
  public.current_user_is_active_in_cabana("cabaña_id")
  AND public.current_user_role_in(ARRAY[
    'owner'::public.app_role,
    'manager'::public.app_role,
    'worker'::public.app_role,
    'admin'::public.app_role,
    'employee'::public.app_role
  ])
  AND public.can_modify_data(auth.uid())
);

DROP POLICY IF EXISTS "Users can view pesajes for their cabaña" ON public.pesajes;
DROP POLICY IF EXISTS "Admins and employees can manage pesajes" ON public.pesajes;

CREATE POLICY "Users can view pesajes for their cabaña"
ON public.pesajes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = pesajes.evento_id
      AND public.current_user_is_active_in_cabana(e."cabaña_id")
  )
);

CREATE POLICY "Owner manager worker can manage pesajes"
ON public.pesajes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = pesajes.evento_id
      AND public.current_user_is_active_in_cabana(e."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY[
    'owner'::public.app_role,
    'manager'::public.app_role,
    'worker'::public.app_role,
    'admin'::public.app_role,
    'employee'::public.app_role
  ])
  AND public.can_modify_data(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = pesajes.evento_id
      AND public.current_user_is_active_in_cabana(e."cabaña_id")
  )
  AND public.current_user_role_in(ARRAY[
    'owner'::public.app_role,
    'manager'::public.app_role,
    'worker'::public.app_role,
    'admin'::public.app_role,
    'employee'::public.app_role
  ])
  AND public.can_modify_data(auth.uid())
);