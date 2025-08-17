-- Fix RLS policies for users table to allow admin operations
CREATE POLICY "Admins can create users in their cabaña" 
ON public.users 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins can delete users in their cabaña" 
ON public.users 
FOR DELETE 
USING (has_role(auth.uid(), 'admin') AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can update users in their cabaña" 
ON public.users 
FOR UPDATE 
USING (cabaña_id = get_current_user_cabana_id())
WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can view users in their cabaña" 
ON public.users 
FOR SELECT 
USING (cabaña_id = get_current_user_cabana_id());