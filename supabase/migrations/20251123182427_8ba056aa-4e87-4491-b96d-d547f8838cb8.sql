-- Fix Critical Security Issues: RLS Policies

-- =====================================================
-- 1. Fix catalogo_causas RLS Policy
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on catalogo_causas" ON public.catalogo_causas;
DROP POLICY IF EXISTS "Users can view death causes for their cabaña" ON public.catalogo_causas;

CREATE POLICY "Users view their cabaña death causes" 
ON public.catalogo_causas 
FOR SELECT
USING (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users manage their cabaña death causes" 
ON public.catalogo_causas 
FOR ALL
USING (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
))
WITH CHECK (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
));

-- =====================================================
-- 2. Fix artificial_inseminations RLS Policy
-- =====================================================
DROP POLICY IF EXISTS "Allow all operations on artificial_inseminations" ON public.artificial_inseminations;

CREATE POLICY "Users view their cabaña inseminations" 
ON public.artificial_inseminations 
FOR SELECT
USING (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users insert their cabaña inseminations" 
ON public.artificial_inseminations 
FOR INSERT
WITH CHECK (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users update their cabaña inseminations" 
ON public.artificial_inseminations 
FOR UPDATE
USING (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
))
WITH CHECK (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users delete their cabaña inseminations" 
ON public.artificial_inseminations 
FOR DELETE
USING (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
));

-- =====================================================
-- 3. Add animal_vaccines RLS Policies
-- =====================================================
CREATE POLICY "Users view their cabaña animal vaccines" 
ON public.animal_vaccines 
FOR SELECT
USING (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users insert their cabaña animal vaccines" 
ON public.animal_vaccines 
FOR INSERT
WITH CHECK (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users update their cabaña animal vaccines" 
ON public.animal_vaccines 
FOR UPDATE
USING (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
))
WITH CHECK (cabaña_id IN (
  SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins delete animal vaccines" 
ON public.animal_vaccines 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);