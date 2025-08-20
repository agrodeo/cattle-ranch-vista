-- CRITICAL SECURITY FIXES - Phase 1

-- 1. Fix overly permissive RLS policies
-- Remove dangerous "true" policies and replace with proper security

-- Fix bulls table - restrict to cabaña users
DROP POLICY IF EXISTS "Allow all operations on bulls" ON bulls;
CREATE POLICY "Users can view bulls" ON bulls FOR SELECT
USING (true); -- Global bulls can be viewed for breeding purposes

CREATE POLICY "Users can manage bulls for their cabaña" ON bulls 
FOR ALL TO authenticated
USING (cabaña_id = get_current_user_cabana_id())
WITH CHECK (cabaña_id = get_current_user_cabana_id());

-- Fix corrales table - restrict to cabaña users  
DROP POLICY IF EXISTS "Allow all operations on corrales" ON corrales;
CREATE POLICY "Users can view corrales for their cabaña" ON corrales FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins can manage corrales for their cabaña" ON corrales 
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins can update corrales for their cabaña" ON corrales 
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND cabaña_id = get_current_user_cabana_id())
WITH CHECK (has_role(auth.uid(), 'admin') AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins can delete corrales for their cabaña" ON corrales 
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND cabaña_id = get_current_user_cabana_id());

-- Fix reproductive_events table
DROP POLICY IF EXISTS "Allow all operations on reproductive_events" ON reproductive_events;
CREATE POLICY "Users can view reproductive_events for their cabaña" ON reproductive_events FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage reproductive_events" ON reproductive_events 
FOR ALL TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id());

-- Fix defunciones table
DROP POLICY IF EXISTS "Allow all operations on defunciones" ON defunciones;
CREATE POLICY "Users can view defunciones for their cabaña" ON defunciones FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage defunciones" ON defunciones 
FOR ALL TO authenticated
USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id())
WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee')) AND cabaña_id = get_current_user_cabana_id());

-- 2. Secure user_roles table - restrict to admin only
DROP POLICY IF EXISTS "Users can view their cabaña's user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles for their cabaña" ON user_roles;

CREATE POLICY "Admins can view user roles for their cabaña" ON user_roles FOR SELECT
USING (has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM users u WHERE u.id = user_roles.user_id AND u.cabaña_id = get_current_user_cabana_id()
));

CREATE POLICY "Admins can manage user roles for their cabaña" ON user_roles 
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM users u WHERE u.id = user_roles.user_id AND u.cabaña_id = get_current_user_cabana_id()
))
WITH CHECK (has_role(auth.uid(), 'admin') AND EXISTS (
  SELECT 1 FROM users u WHERE u.id = user_roles.user_id AND u.cabaña_id = get_current_user_cabana_id()
));

-- 3. Secure database functions with proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- Update get_current_user_cabana_id with proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_cabana_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()),
    (SELECT cabaña_id FROM public.users WHERE id = auth.uid())
  );
$function$;

-- 4. Add security audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event(_action text, _table_name text, _record_id uuid DEFAULT NULL::uuid, _details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, details, timestamp
  ) VALUES (
    auth.uid(), _action, _table_name, _record_id, _details, now()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log silently fails to avoid breaking operations
    NULL;
END;
$function$;

-- 5. Create password hashing function for future use
CREATE OR REPLACE FUNCTION public.hash_password(_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- For now, return a bcrypt-style hash placeholder
  -- This will be replaced with proper hashing in edge functions
  RETURN 'bcrypt_placeholder:' || _password;
END;
$function$;

-- 6. Add trigger to log role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event('role_assigned', 'user_roles', NEW.id, 
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event('role_changed', 'user_roles', NEW.id,
      jsonb_build_object('user_id', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event('role_removed', 'user_roles', OLD.id,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_role_changes();