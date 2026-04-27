UPDATE public.user_roles SET role = 'owner' WHERE role = 'admin';
UPDATE public.user_roles SET role = 'worker' WHERE role = 'employee';

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  SELECT role INTO _role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF _role = 'admin'::public.app_role THEN
    RETURN 'owner'::public.app_role;
  ELSIF _role = 'employee'::public.app_role THEN
    RETURN 'worker'::public.app_role;
  END IF;

  RETURN COALESCE(_role, 'read_only'::public.app_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'owner'::public.app_role AND role = 'admin'::public.app_role)
        OR (_role = 'worker'::public.app_role AND role = 'employee'::public.app_role)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_data(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid
      AND role IN ('owner', 'manager', 'worker', 'admin', 'employee')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_users(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'manager', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_active_in_cabana(_cabana_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p."cabaña_id" = _cabana_id
      AND COALESCE(p.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role_in(_roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY(_roles)
  );
$$;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all users" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all users" ON public.profiles;
DROP POLICY IF EXISTS "Ranch managers can view cabana profiles" ON public.profiles;
DROP POLICY IF EXISTS "Ranch managers can update cabana profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Ranch managers can view cabana profiles" ON public.profiles FOR SELECT USING (public.can_manage_users(auth.uid()) AND "cabaña_id" = public.get_current_user_cabana_id());
CREATE POLICY "Ranch managers can update cabana profiles" ON public.profiles FOR UPDATE USING (public.can_manage_users(auth.uid()) AND user_id <> auth.uid() AND "cabaña_id" = public.get_current_user_cabana_id()) WITH CHECK (public.can_manage_users(auth.uid()) AND "cabaña_id" = public.get_current_user_cabana_id());

DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Ranch managers can view cabana roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can update cabana roles" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Ranch managers can view cabana roles" ON public.user_roles FOR SELECT USING (public.can_manage_users(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = user_roles.user_id AND p."cabaña_id" = public.get_current_user_cabana_id()));
CREATE POLICY "Owners can update cabana roles" ON public.user_roles FOR UPDATE USING (public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role]) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = user_roles.user_id AND p."cabaña_id" = public.get_current_user_cabana_id())) WITH CHECK (public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role]) AND role IN ('manager', 'worker', 'vet', 'read_only', 'employee'));

DROP POLICY IF EXISTS "Users can view animals for their cabaña" ON public.animals;
DROP POLICY IF EXISTS "Admins and employees can manage animals for their cabaña" ON public.animals;
DROP POLICY IF EXISTS "Admins and employees can update animals for their cabaña" ON public.animals;
DROP POLICY IF EXISTS "Admins and employees can delete animals for their cabaña" ON public.animals;
CREATE POLICY "Users can view animals for their cabaña" ON public.animals FOR SELECT USING (public.current_user_is_active_in_cabana("cabaña_id"));
CREATE POLICY "Owner manager worker can create animals" ON public.animals FOR INSERT WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_add_animals(auth.uid()));
CREATE POLICY "Owner manager worker can update animals" ON public.animals FOR UPDATE USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid())) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid()));
CREATE POLICY "Owner manager worker can delete animals" ON public.animals FOR DELETE USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]));

DROP POLICY IF EXISTS "Users can view corrales for their cabaña" ON public.corrales;
DROP POLICY IF EXISTS "Admins can manage corrales for their cabaña" ON public.corrales;
DROP POLICY IF EXISTS "Admins can update corrales for their cabaña" ON public.corrales;
DROP POLICY IF EXISTS "Admins can delete corrales for their cabaña" ON public.corrales;
CREATE POLICY "Users can view corrales for their cabaña" ON public.corrales FOR SELECT USING (public.current_user_is_active_in_cabana("cabaña_id"));
CREATE POLICY "Owner manager worker can create corrales" ON public.corrales FOR INSERT WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid()));
CREATE POLICY "Owner manager worker can update corrales" ON public.corrales FOR UPDATE USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid())) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]) AND public.can_modify_data(auth.uid()));
CREATE POLICY "Owner manager worker can delete corrales" ON public.corrales FOR DELETE USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]));

DROP POLICY IF EXISTS "Users can view movements for their cabaña" ON public.corral_movements;
DROP POLICY IF EXISTS "Admins and employees can manage movements" ON public.corral_movements;
CREATE POLICY "Users can view movements for their cabaña" ON public.corral_movements FOR SELECT USING (public.current_user_is_active_in_cabana("cabaña_id"));
CREATE POLICY "Owner manager worker can manage movements" ON public.corral_movements FOR ALL USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]));

DROP POLICY IF EXISTS "Users can manage weight history for their cabaña" ON public.animal_weight_history;
DROP POLICY IF EXISTS "Users can view weight history for their cabaña" ON public.animal_weight_history;
CREATE POLICY "Users can view weight history for their cabaña" ON public.animal_weight_history FOR SELECT USING (public.current_user_is_active_in_cabana("cabaña_id"));
CREATE POLICY "Owner manager worker can manage weight history" ON public.animal_weight_history FOR ALL USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]));

DROP POLICY IF EXISTS "Users can view their cabaña's animal vaccines" ON public.animal_vaccines;
DROP POLICY IF EXISTS "Users can insert animal vaccines for their cabaña" ON public.animal_vaccines;
DROP POLICY IF EXISTS "Users can update animal vaccines for their cabaña" ON public.animal_vaccines;
DROP POLICY IF EXISTS "Users can delete animal vaccines for their cabaña" ON public.animal_vaccines;
DROP POLICY IF EXISTS "Admins delete animal vaccines" ON public.animal_vaccines;
DROP POLICY IF EXISTS "Users view their cabaña animal vaccines" ON public.animal_vaccines;
DROP POLICY IF EXISTS "Users insert their cabaña animal vaccines" ON public.animal_vaccines;
DROP POLICY IF EXISTS "Users update their cabaña animal vaccines" ON public.animal_vaccines;
CREATE POLICY "Users can view animal vaccines for their cabaña" ON public.animal_vaccines FOR SELECT USING (public.current_user_is_active_in_cabana("cabaña_id"));
CREATE POLICY "Health roles can manage animal vaccines" ON public.animal_vaccines FOR ALL USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'vet'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'vet'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]));

DROP POLICY IF EXISTS "Users can view defunciones for their cabaña" ON public.defunciones;
DROP POLICY IF EXISTS "Admins and employees can manage defunciones" ON public.defunciones;
DROP POLICY IF EXISTS "Users manage their cabaña death records" ON public.defunciones;
DROP POLICY IF EXISTS "Users view their cabaña death records" ON public.defunciones;
CREATE POLICY "Users can view defunciones for their cabaña" ON public.defunciones FOR SELECT USING (public.current_user_is_active_in_cabana("cabaña_id"));
CREATE POLICY "Health roles can manage defunciones" ON public.defunciones FOR ALL USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'vet'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role])) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'worker'::public.app_role, 'vet'::public.app_role, 'admin'::public.app_role, 'employee'::public.app_role]));

DROP POLICY IF EXISTS "Usuarios pueden ver finanzas de su cabaña" ON public.finances;
DROP POLICY IF EXISTS "Admins y empleados pueden crear finanzas en su cabaña" ON public.finances;
DROP POLICY IF EXISTS "Admins y empleados pueden actualizar finanzas en su cabaña" ON public.finances;
DROP POLICY IF EXISTS "Admins y empleados pueden eliminar finanzas en su cabaña" ON public.finances;
CREATE POLICY "Owner manager can view finances" ON public.finances FOR SELECT USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role]));
CREATE POLICY "Owner manager can manage finances" ON public.finances FOR ALL USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role])) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role]));

DROP POLICY IF EXISTS "Users can view finance categories (system or own cabana)" ON public.finance_categories;
DROP POLICY IF EXISTS "Users can insert finance categories for their cabana" ON public.finance_categories;
DROP POLICY IF EXISTS "Users can update finance categories for their cabana" ON public.finance_categories;
DROP POLICY IF EXISTS "Users can delete finance categories for their cabana" ON public.finance_categories;
CREATE POLICY "Owner manager can view finance categories" ON public.finance_categories FOR SELECT USING ("cabaña_id" IS NULL OR (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role])));
CREATE POLICY "Owner manager can manage finance categories" ON public.finance_categories FOR ALL USING (is_system = false AND public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role])) WITH CHECK (is_system = false AND public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role]));

DROP POLICY IF EXISTS "Users can view recurring for their cabana" ON public.finance_recurring;
DROP POLICY IF EXISTS "Users can insert recurring for their cabana" ON public.finance_recurring;
DROP POLICY IF EXISTS "Users can update recurring for their cabana" ON public.finance_recurring;
DROP POLICY IF EXISTS "Users can delete recurring for their cabana" ON public.finance_recurring;
CREATE POLICY "Owner manager can view recurring finance" ON public.finance_recurring FOR SELECT USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role]));
CREATE POLICY "Owner manager can manage recurring finance" ON public.finance_recurring FOR ALL USING (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role])) WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id") AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role]));

DROP POLICY IF EXISTS "Users can view their cabaña" ON public.cabañas;
DROP POLICY IF EXISTS "Users can update their own cabaña" ON public.cabañas;
DROP POLICY IF EXISTS "Users can delete their own cabaña" ON public.cabañas;
CREATE POLICY "Owner can view cabana" ON public.cabañas FOR SELECT USING (owner_id = auth.uid() OR (id = public.get_current_user_cabana_id() AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role])));
CREATE POLICY "Owner can update cabana" ON public.cabañas FOR UPDATE USING (owner_id = auth.uid() OR (id = public.get_current_user_cabana_id() AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role]))) WITH CHECK (owner_id = auth.uid() OR id = public.get_current_user_cabana_id());
CREATE POLICY "Owner can delete cabana" ON public.cabañas FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "subscriptions_ro" ON public.billing_subscriptions;
DROP POLICY IF EXISTS "customers_rw" ON public.billing_customers;
DROP POLICY IF EXISTS "payments_ro" ON public.billing_payments;
CREATE POLICY "Owner can view billing subscriptions" ON public.billing_subscriptions FOR SELECT USING (cabana_id = public.get_current_user_cabana_id() AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role]));
CREATE POLICY "Owner can manage billing customers" ON public.billing_customers FOR ALL USING (cabana_id = public.get_current_user_cabana_id() AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role])) WITH CHECK (cabana_id = public.get_current_user_cabana_id() AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role]));
CREATE POLICY "Owner can view billing payments" ON public.billing_payments FOR SELECT USING (cabana_id = public.get_current_user_cabana_id() AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role]));

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_by_cabana" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_by_cabana_owner" ON public.subscriptions;
CREATE POLICY "Owner can view subscriptions" ON public.subscriptions FOR SELECT USING ("cabaña_id" = public.get_current_user_cabana_id() AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role]));
CREATE POLICY "Owner can update subscriptions" ON public.subscriptions FOR UPDATE USING ("cabaña_id" = public.get_current_user_cabana_id() AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role])) WITH CHECK ("cabaña_id" = public.get_current_user_cabana_id() AND public.current_user_role_in(ARRAY['owner'::public.app_role, 'admin'::public.app_role]));