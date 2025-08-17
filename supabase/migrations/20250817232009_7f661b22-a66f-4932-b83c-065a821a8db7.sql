-- Step 2: RLS Policies and Security Fixes

-- Enable RLS on all new tables
ALTER TABLE public.herd_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herd_vaccine_overrides ENABLE ROW LEVEL SECURITY;

-- Fix the update function with proper security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Helper function to get user's cabaña_id (reuse existing function)
CREATE OR REPLACE FUNCTION public.get_current_user_cabana_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cabaña_id 
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- RLS Policies for herd_settings
CREATE POLICY "Users can view their own herd settings"
ON public.herd_settings FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can insert their own herd settings"
ON public.herd_settings FOR INSERT
WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can update their own herd settings"
ON public.herd_settings FOR UPDATE
USING (cabaña_id = get_current_user_cabana_id())
WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can delete their own herd settings"
ON public.herd_settings FOR DELETE
USING (cabaña_id = get_current_user_cabana_id());

-- RLS Policies for animal_vaccines (user's cabaña only)
CREATE POLICY "Users can view their cabaña's animal vaccines"
ON public.animal_vaccines FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can insert animal vaccines for their cabaña"
ON public.animal_vaccines FOR INSERT
WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can update animal vaccines for their cabaña"
ON public.animal_vaccines FOR UPDATE
USING (cabaña_id = get_current_user_cabana_id())
WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can delete animal vaccines for their cabaña"
ON public.animal_vaccines FOR DELETE
USING (cabaña_id = get_current_user_cabana_id());

-- RLS Policies for herd_vaccine_overrides
CREATE POLICY "Users can view their cabaña's vaccine overrides"
ON public.herd_vaccine_overrides FOR SELECT
USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can insert vaccine overrides for their cabaña"
ON public.herd_vaccine_overrides FOR INSERT
WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can update vaccine overrides for their cabaña"
ON public.herd_vaccine_overrides FOR UPDATE
USING (cabaña_id = get_current_user_cabana_id())
WITH CHECK (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can delete vaccine overrides for their cabaña"
ON public.herd_vaccine_overrides FOR DELETE
USING (cabaña_id = get_current_user_cabana_id());

-- RLS Policies for catalog tables (readable by all, writable by admin)
CREATE POLICY "Anyone can view vaccines"
ON public.vaccines FOR SELECT
USING (true);

CREATE POLICY "Anyone can view vaccine aliases"
ON public.vaccine_aliases FOR SELECT
USING (true);

CREATE POLICY "Anyone can view jurisdictions"
ON public.jurisdictions FOR SELECT
USING (true);

CREATE POLICY "Anyone can view vaccine rules"
ON public.vaccine_rules FOR SELECT
USING (true);

CREATE POLICY "Anyone can view vaccine campaigns"
ON public.vaccine_campaigns FOR SELECT
USING (true);

-- Admin-only write policies for catalog tables (for future admin interface)
CREATE POLICY "Admins can manage vaccines"
ON public.vaccines FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage vaccine aliases"
ON public.vaccine_aliases FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage jurisdictions"
ON public.jurisdictions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage vaccine rules"
ON public.vaccine_rules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage vaccine campaigns"
ON public.vaccine_campaigns FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));