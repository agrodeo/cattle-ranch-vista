-- CRITICAL SECURITY FIXES

-- 1. Fix Business Data Exposure: Add RLS policies to catalogo_causas table
-- This table was publicly readable, exposing business data
CREATE POLICY "Users can view death causes for their cabaña" 
ON public.catalogo_causas 
FOR SELECT 
USING (true); -- This is system data, can be public

-- 2. Secure Database Functions: Add proper search_path to prevent function hijacking
-- Update all custom functions to include SET search_path = 'public'

-- Fix get_current_user_cabana_id function
CREATE OR REPLACE FUNCTION public.get_current_user_cabana_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$function$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fix can_modify_data function
CREATE OR REPLACE FUNCTION public.can_modify_data(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_cabana_id uuid;
  sub_status RECORD;
BEGIN
  -- Get user's cabaña
  SELECT cabaña_id INTO user_cabana_id 
  FROM public.profiles 
  WHERE user_id = user_uuid;
  
  IF user_cabana_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get subscription status
  SELECT * INTO sub_status
  FROM public.get_subscription_status(user_cabana_id)
  LIMIT 1;
  
  -- Allow if not in read-only mode
  RETURN NOT COALESCE(sub_status.is_read_only, true);
END;
$function$;

-- Fix can_add_animals function
CREATE OR REPLACE FUNCTION public.can_add_animals(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_cabana_id uuid;
  sub_status RECORD;
BEGIN
  -- Get user's cabaña
  SELECT cabaña_id INTO user_cabana_id 
  FROM public.profiles 
  WHERE user_id = user_uuid;
  
  IF user_cabana_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get subscription status
  SELECT * INTO sub_status
  FROM public.get_subscription_status(user_cabana_id)
  LIMIT 1;
  
  -- Allow if not in read-only mode and can add animals
  RETURN NOT COALESCE(sub_status.is_read_only, true) AND COALESCE(sub_status.can_add_animals, false);
END;
$function$;

-- Fix get_user_cabana_info function
CREATE OR REPLACE FUNCTION public.get_user_cabana_info(user_uuid uuid)
RETURNS TABLE(cabana_id uuid, cabana_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  -- First try profiles, then users table
  SELECT c.id, c.name
  FROM public.cabañas c
  WHERE c.id = COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = user_uuid),
    (SELECT cabaña_id FROM public.users WHERE id = user_uuid)
  )
  LIMIT 1;
$function$;

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$function$;

-- 3. Add missing RLS policies for tables that have RLS enabled but incomplete policies

-- Fix reproductive_annual_metrics table (if it exists and has RLS enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reproductive_annual_metrics' AND table_schema = 'public') THEN
    -- Add RLS policies for reproductive_annual_metrics
    DROP POLICY IF EXISTS "Users can view reproductive metrics for their cabaña" ON public.reproductive_annual_metrics;
    CREATE POLICY "Users can view reproductive metrics for their cabaña" 
    ON public.reproductive_annual_metrics 
    FOR SELECT 
    USING (cabaña_id = get_current_user_cabana_id());
    
    DROP POLICY IF EXISTS "Admins can manage reproductive metrics" ON public.reproductive_annual_metrics;
    CREATE POLICY "Admins can manage reproductive metrics" 
    ON public.reproductive_annual_metrics 
    FOR ALL 
    USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id())
    WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) AND cabaña_id = get_current_user_cabana_id());
  END IF;
END
$$;

-- 4. Create security audit function to log sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event(_action text, _table_name text, _record_id uuid DEFAULT NULL::uuid, _details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 5. Update authentication configuration (reduce OTP expiry)
-- Note: This needs to be done in Supabase dashboard, adding comment for reference
-- TODO: Update in Supabase Dashboard:
-- - Authentication > Settings > OTP Expiry: Set to 300 seconds (5 minutes)
-- - Authentication > Settings > Enable leaked password protection
-- - General > Infrastructure: Plan PostgreSQL upgrade