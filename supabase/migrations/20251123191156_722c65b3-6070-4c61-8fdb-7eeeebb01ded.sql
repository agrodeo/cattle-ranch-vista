-- Phase 1: Vaccination System Redesign - Database Cleanup (Final)

-- Part 1: Drop foreign key constraint from animal_vaccines to vaccines table
ALTER TABLE animal_vaccines DROP CONSTRAINT IF EXISTS animal_vaccines_vaccine_code_fkey;

-- Part 2: Migrate historical data from vacunas_historial to animal_vaccines
-- Use the cabaña owner as the creator for historical records
INSERT INTO animal_vaccines (
  animal_id, 
  cabaña_id, 
  vaccine_code, 
  date, 
  lot, 
  dose, 
  route, 
  dose_number, 
  next_due,
  created_by,
  created_at
)
SELECT 
  vh.animal_id,
  vh.cabaña_id,
  COALESCE(vh.vacuna, 'OTHER'),
  vh.fecha,
  vh.lote,
  vh.dosis,
  vh.via,
  COALESCE(vh.dose_number, 1),
  vh.proxima_dosis,
  COALESCE(
    (SELECT owner_id FROM cabañas WHERE id = vh.cabaña_id),
    (SELECT user_id FROM profiles WHERE cabaña_id = vh.cabaña_id LIMIT 1)
  ),
  vh.created_at
FROM vacunas_historial vh
WHERE NOT EXISTS (
  SELECT 1 FROM animal_vaccines av 
  WHERE av.animal_id = vh.animal_id 
  AND av.date = vh.fecha
  AND av.vaccine_code = COALESCE(vh.vacuna, 'OTHER')
)
ON CONFLICT DO NOTHING;

-- Part 3: Drop legacy views
DROP VIEW IF EXISTS vaccination_history_unified CASCADE;

-- Part 4: Drop legacy tables that are no longer used
DROP TABLE IF EXISTS vaccine_rules CASCADE;
DROP TABLE IF EXISTS vaccine_campaigns CASCADE;
DROP TABLE IF EXISTS vaccination_schemes CASCADE;
DROP TABLE IF EXISTS vaccines CASCADE;
DROP TABLE IF EXISTS vaccine_aliases CASCADE;
DROP TABLE IF EXISTS custom_vaccines CASCADE;

-- Part 5: Drop the old vacunas_historial table (data already migrated)
DROP TABLE IF EXISTS vacunas_historial CASCADE;

-- Part 6: Drop old vaccination-related tables
DROP TABLE IF EXISTS vacunaciones CASCADE;

-- Part 7: Drop old functions that used the legacy system
DROP FUNCTION IF EXISTS compile_rules_for_ranch CASCADE;
DROP FUNCTION IF EXISTS compute_due_vaccines_for_animal CASCADE;
DROP FUNCTION IF EXISTS get_animal_vaccination_status CASCADE;

-- Part 8: Create vaccination alerts table for future alerting system
CREATE TABLE IF NOT EXISTS vaccination_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  cabaña_id UUID NOT NULL REFERENCES cabañas(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES cabaña_vaccination_requirements(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('overdue', 'due_soon', 'missing')),
  alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_overdue INTEGER,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for vaccination_alerts
ALTER TABLE vaccination_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vaccination alerts for their cabaña"
  ON vaccination_alerts FOR SELECT
  USING (cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Admins and employees can manage vaccination alerts"
  ON vaccination_alerts FOR ALL
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee'))
    AND cabaña_id = get_current_user_cabana_id()
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee'))
    AND cabaña_id = get_current_user_cabana_id()
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_vaccination_alerts_animal ON vaccination_alerts(animal_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_alerts_cabana ON vaccination_alerts(cabaña_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_alerts_type ON vaccination_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_vaccination_alerts_unresolved ON vaccination_alerts(resolved_at) WHERE resolved_at IS NULL;