
-- Phase 3: Semen inventory for IA module
CREATE TABLE IF NOT EXISTS public.semen_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cabaña_id" UUID NOT NULL,
  bull_id UUID REFERENCES public.bulls(id) ON DELETE SET NULL,
  bull_manual JSONB,
  batch_code TEXT,
  straw_type TEXT NOT NULL DEFAULT 'convencional'
    CHECK (straw_type IN ('convencional','sexado_hembra','sexado_macho')),
  doses_total INTEGER NOT NULL DEFAULT 0 CHECK (doses_total >= 0),
  doses_remaining INTEGER NOT NULL DEFAULT 0 CHECK (doses_remaining >= 0),
  tank TEXT,
  canister TEXT,
  cane_position TEXT,
  cost_per_dose NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  centro_semen TEXT,
  purchase_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.semen_inventory TO authenticated;
GRANT ALL ON public.semen_inventory TO service_role;

ALTER TABLE public.semen_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "semen_inventory_select"
  ON public.semen_inventory FOR SELECT TO authenticated
  USING (public.current_user_is_active_in_cabana("cabaña_id"));

CREATE POLICY "semen_inventory_insert"
  ON public.semen_inventory FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id"));

CREATE POLICY "semen_inventory_update"
  ON public.semen_inventory FOR UPDATE TO authenticated
  USING (public.current_user_is_active_in_cabana("cabaña_id"))
  WITH CHECK (public.current_user_is_active_in_cabana("cabaña_id"));

CREATE POLICY "semen_inventory_delete"
  ON public.semen_inventory FOR DELETE TO authenticated
  USING (public.current_user_is_active_in_cabana("cabaña_id"));

CREATE INDEX IF NOT EXISTS idx_semen_inventory_cabana
  ON public.semen_inventory("cabaña_id");
CREATE INDEX IF NOT EXISTS idx_semen_inventory_bull
  ON public.semen_inventory(bull_id);

CREATE TRIGGER trg_semen_inventory_updated_at
  BEFORE UPDATE ON public.semen_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link IA services to an inventory row (optional).
ALTER TABLE public.artificial_inseminations
  ADD COLUMN IF NOT EXISTS semen_inventory_id UUID
  REFERENCES public.semen_inventory(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_artificial_inseminations_semen_inventory
  ON public.artificial_inseminations(semen_inventory_id);
