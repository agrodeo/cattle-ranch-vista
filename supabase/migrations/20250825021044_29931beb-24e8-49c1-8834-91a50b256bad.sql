-- Fix potential RLS policy recursion in users/profiles tables
-- Drop and recreate policies to avoid circular references

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Users can view their own record and same cabaña users" ON public.users;
DROP POLICY IF EXISTS "Allow viewing cabaña profiles" ON public.profiles;

-- Create security definer function to get current user's cabaña_id safely
CREATE OR REPLACE FUNCTION public.get_current_user_cabana_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Recreate users table policies without recursion
CREATE POLICY "Users can view their own record and same cabaña users" 
ON public.users 
FOR SELECT 
USING (
  (auth.uid() = id) OR 
  (cabaña_id = get_current_user_cabana_id())
);

-- Recreate profiles table policies without recursion  
CREATE POLICY "Allow viewing cabaña profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (cabaña_id = get_current_user_cabana_id())
);

-- Add RLS policies for missing tables
-- pesajes table
CREATE POLICY "Users can view pesajes for their cabaña" 
ON public.pesajes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM eventos e 
    WHERE e.id = pesajes.evento_id 
    AND e.cabaña_id = get_current_user_cabana_id()
  )
);

CREATE POLICY "Admins and employees can manage pesajes" 
ON public.pesajes 
FOR ALL 
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND EXISTS (
    SELECT 1 FROM eventos e 
    WHERE e.id = pesajes.evento_id 
    AND e.cabaña_id = get_current_user_cabana_id()
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND EXISTS (
    SELECT 1 FROM eventos e 
    WHERE e.id = pesajes.evento_id 
    AND e.cabaña_id = get_current_user_cabana_id()
  )
);

-- tactos table
CREATE POLICY "Users can view tactos for their cabaña" 
ON public.tactos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM eventos e 
    WHERE e.id = tactos.evento_id 
    AND e.cabaña_id = get_current_user_cabana_id()
  )
);

CREATE POLICY "Admins and employees can manage tactos" 
ON public.tactos 
FOR ALL 
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND EXISTS (
    SELECT 1 FROM eventos e 
    WHERE e.id = tactos.evento_id 
    AND e.cabaña_id = get_current_user_cabana_id()
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND EXISTS (
    SELECT 1 FROM eventos e 
    WHERE e.id = tactos.evento_id 
    AND e.cabaña_id = get_current_user_cabana_id()
  )
);

-- preñeces table
CREATE POLICY "Users can view preñeces for their cabaña" 
ON public.preñeces 
FOR SELECT 
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage preñeces" 
ON public.preñeces 
FOR ALL 
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND cabaña_id = get_current_user_cabana_id()
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND cabaña_id = get_current_user_cabana_id()
);

-- finances_animal_sales table
CREATE POLICY "Users can view animal sales for their cabaña" 
ON public.finances_animal_sales 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM finances f 
    WHERE f.id = finances_animal_sales.finance_id 
    AND f.cabaña_id = get_current_user_cabana_id()
  )
);

CREATE POLICY "Admins and employees can manage animal sales" 
ON public.finances_animal_sales 
FOR ALL 
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND EXISTS (
    SELECT 1 FROM finances f 
    WHERE f.id = finances_animal_sales.finance_id 
    AND f.cabaña_id = get_current_user_cabana_id()
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND EXISTS (
    SELECT 1 FROM finances f 
    WHERE f.id = finances_animal_sales.finance_id 
    AND f.cabaña_id = get_current_user_cabana_id()
  )
);

-- vacunas_historial table
CREATE POLICY "Users can view vaccine history for their cabaña" 
ON public.vacunas_historial 
FOR SELECT 
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage vaccine history" 
ON public.vacunas_historial 
FOR ALL 
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND cabaña_id = get_current_user_cabana_id()
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'employee'::app_role)) 
  AND cabaña_id = get_current_user_cabana_id()
);