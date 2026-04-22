-- Add RLS policies for custom_benchmarks (table had RLS enabled but no policies, blocking all access)

CREATE POLICY "Users can view their cabaña benchmarks"
ON public.custom_benchmarks
FOR SELECT
TO authenticated
USING ("cabaña_id" = public.get_current_user_cabana_id());

CREATE POLICY "Users can insert their cabaña benchmarks"
ON public.custom_benchmarks
FOR INSERT
TO authenticated
WITH CHECK ("cabaña_id" = public.get_current_user_cabana_id());

CREATE POLICY "Users can update their cabaña benchmarks"
ON public.custom_benchmarks
FOR UPDATE
TO authenticated
USING ("cabaña_id" = public.get_current_user_cabana_id())
WITH CHECK ("cabaña_id" = public.get_current_user_cabana_id());

CREATE POLICY "Users can delete their cabaña benchmarks"
ON public.custom_benchmarks
FOR DELETE
TO authenticated
USING ("cabaña_id" = public.get_current_user_cabana_id());