CREATE TABLE IF NOT EXISTS public.animal_deps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  "cabaña_id" UUID NOT NULL REFERENCES public."cabañas"(id) ON DELETE CASCADE,
  source TEXT,
  evaluation_date DATE,
  accuracy NUMERIC(3,2),
  dep_peso_nacer NUMERIC(6,2),
  dep_peso_nacer_acc NUMERIC(3,2),
  dep_peso_destete NUMERIC(6,2),
  dep_peso_destete_acc NUMERIC(3,2),
  dep_peso_final NUMERIC(6,2),
  dep_peso_final_acc NUMERIC(3,2),
  dep_leche NUMERIC(6,2),
  dep_leche_acc NUMERIC(3,2),
  dep_circunferencia_escrotal NUMERIC(5,2),
  dep_circunferencia_escrotal_acc NUMERIC(3,2),
  dep_largo_gestacion NUMERIC(5,2),
  dep_largo_gestacion_acc NUMERIC(3,2),
  dep_area_ojo_bife NUMERIC(6,2),
  dep_area_ojo_bife_acc NUMERIC(3,2),
  dep_grasa_dorsal NUMERIC(5,2),
  dep_grasa_dorsal_acc NUMERIC(3,2),
  dep_grasa_cadera NUMERIC(5,2),
  dep_grasa_cadera_acc NUMERIC(3,2),
  dep_grasa_intramuscular NUMERIC(5,2),
  dep_grasa_intramuscular_acc NUMERIC(3,2),
  dep_docilidad NUMERIC(5,2),
  dep_docilidad_acc NUMERIC(3,2),
  custom_deps JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT animal_deps_animal_unique UNIQUE (animal_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.animal_deps TO authenticated;
GRANT ALL ON public.animal_deps TO service_role;

ALTER TABLE public.animal_deps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DEPs for their cabaña"
  ON public.animal_deps FOR SELECT
  USING (current_user_is_active_in_cabana("cabaña_id"));

CREATE POLICY "Owner manager worker can insert DEPs"
  ON public.animal_deps FOR INSERT
  WITH CHECK (
    current_user_is_active_in_cabana("cabaña_id")
    AND current_user_role_in(ARRAY['owner'::app_role, 'manager'::app_role, 'worker'::app_role, 'admin'::app_role, 'employee'::app_role])
    AND can_modify_data(auth.uid())
  );

CREATE POLICY "Owner manager worker can update DEPs"
  ON public.animal_deps FOR UPDATE
  USING (
    current_user_is_active_in_cabana("cabaña_id")
    AND current_user_role_in(ARRAY['owner'::app_role, 'manager'::app_role, 'worker'::app_role, 'admin'::app_role, 'employee'::app_role])
    AND can_modify_data(auth.uid())
  )
  WITH CHECK (
    current_user_is_active_in_cabana("cabaña_id")
    AND current_user_role_in(ARRAY['owner'::app_role, 'manager'::app_role, 'worker'::app_role, 'admin'::app_role, 'employee'::app_role])
    AND can_modify_data(auth.uid())
  );

CREATE POLICY "Owner manager worker can delete DEPs"
  ON public.animal_deps FOR DELETE
  USING (
    current_user_is_active_in_cabana("cabaña_id")
    AND current_user_role_in(ARRAY['owner'::app_role, 'manager'::app_role, 'worker'::app_role, 'admin'::app_role, 'employee'::app_role])
    AND can_modify_data(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_animal_deps_animal ON public.animal_deps(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_deps_cabana ON public.animal_deps("cabaña_id");

CREATE TRIGGER trg_animal_deps_updated_at
  BEFORE UPDATE ON public.animal_deps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();