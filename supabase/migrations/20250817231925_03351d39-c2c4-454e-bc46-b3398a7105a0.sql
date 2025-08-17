-- Location-Aware Vaccination Compliance System
-- Step 1: Core Schema and Tables

-- 1. Herd Settings (Ranch Configuration)
CREATE TABLE IF NOT EXISTS public.herd_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabaña_id UUID NOT NULL,
  country TEXT NOT NULL, -- ISO-3166-1 alpha-2
  region TEXT, -- ISO-3166-2 or service label
  lat NUMERIC,
  lng NUMERIC,
  herd_type TEXT CHECK (herd_type IN ('cría', 'recría', 'feedlot', 'tambo', 'mixto')),
  service_type TEXT CHECK (service_type IN ('IA', 'toros', 'mixto')),
  compliance_mode TEXT NOT NULL DEFAULT 'strict' CHECK (compliance_mode IN ('strict', 'advisory')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cabaña_id)
);

-- 2. Vaccines Catalog
CREATE TABLE IF NOT EXISTS public.vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  species TEXT NOT NULL DEFAULT 'bovine',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Vaccine Aliases (for import mapping)
CREATE TABLE IF NOT EXISTS public.vaccine_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_code TEXT NOT NULL REFERENCES public.vaccines(code),
  alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (vaccine_code, alias)
);

-- 4. Jurisdictions (Countries and Regions)
CREATE TABLE IF NOT EXISTS public.jurisdictions (
  code TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_code TEXT NULL REFERENCES public.jurisdictions(code),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Vaccine Rules (Core Compliance Rules)
CREATE TABLE IF NOT EXISTS public.vaccine_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code TEXT NOT NULL REFERENCES public.jurisdictions(code),
  vaccine_code TEXT NOT NULL REFERENCES public.vaccines(code),
  mandatory BOOLEAN NOT NULL DEFAULT false,
  one_time BOOLEAN NOT NULL DEFAULT false,
  booster_interval_days INTEGER NULL,
  coverage_window_days INTEGER NULL,
  sex TEXT NOT NULL DEFAULT 'ANY' CHECK (sex IN ('M', 'F', 'ANY')),
  min_age_days INTEGER NOT NULL DEFAULT 0,
  max_age_days INTEGER NULL,
  category TEXT NOT NULL DEFAULT 'cualquiera' CHECK (category IN ('ternero', 'vaquillona', 'vaca', 'toro', 'cualquiera')),
  pregnancy_ok BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  source_url TEXT DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Campaign Windows (e.g., Aftosa campaigns)
CREATE TABLE IF NOT EXISTS public.vaccine_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code TEXT NOT NULL REFERENCES public.jurisdictions(code),
  vaccine_code TEXT NOT NULL REFERENCES public.vaccines(code),
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Animal Vaccination History
CREATE TABLE IF NOT EXISTS public.animal_vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES public.animals(id),
  cabaña_id UUID NOT NULL,
  vaccine_code TEXT NOT NULL REFERENCES public.vaccines(code),
  date DATE NOT NULL,
  lot TEXT NULL,
  dose TEXT NULL,
  route TEXT NULL,
  next_due DATE NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT chk_date_not_future CHECK (date <= CURRENT_DATE)
);

-- 8. Ranch Overrides (optional custom rules)
CREATE TABLE IF NOT EXISTS public.herd_vaccine_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabaña_id UUID NOT NULL,
  jurisdiction_code TEXT NOT NULL,
  rule_jsonb JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_herd_settings_cabana ON public.herd_settings(cabaña_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_rules_jurisdiction ON public.vaccine_rules(jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_vaccine_rules_vaccine ON public.vaccine_rules(vaccine_code);
CREATE INDEX IF NOT EXISTS idx_vaccine_campaigns_jurisdiction_vaccine ON public.vaccine_campaigns(jurisdiction_code, vaccine_code);
CREATE INDEX IF NOT EXISTS idx_animal_vaccines_animal_vaccine_date ON public.animal_vaccines(animal_id, vaccine_code, date);
CREATE INDEX IF NOT EXISTS idx_animal_vaccines_cabana ON public.animal_vaccines(cabaña_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_herd_settings_updated_at
  BEFORE UPDATE ON public.herd_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vaccine_rules_updated_at
  BEFORE UPDATE ON public.vaccine_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_herd_vaccine_overrides_updated_at
  BEFORE UPDATE ON public.herd_vaccine_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();