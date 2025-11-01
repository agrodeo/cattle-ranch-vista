-- ============================================================================
-- MIGRATION: Vaccination System - Schema Changes Only
-- ============================================================================

-- 1. Add vaccine_code column to cabaña_vaccination_requirements with FK to vaccines
-- ============================================================================
ALTER TABLE cabaña_vaccination_requirements 
ADD COLUMN IF NOT EXISTS vaccine_code text;

-- Add foreign key constraint to vaccines table
ALTER TABLE cabaña_vaccination_requirements
DROP CONSTRAINT IF EXISTS cabaña_vaccination_requirements_vaccine_code_fkey;

ALTER TABLE cabaña_vaccination_requirements
ADD CONSTRAINT cabaña_vaccination_requirements_vaccine_code_fkey
FOREIGN KEY (vaccine_code) REFERENCES vaccines(code);

-- Populate codes by mapping vaccine names to known vaccine codes
UPDATE cabaña_vaccination_requirements
SET vaccine_code = CASE 
  WHEN LOWER(vaccine_name) LIKE '%aftosa%' OR LOWER(vaccine_name) LIKE '%fmd%' THEN 'fmd'
  WHEN LOWER(vaccine_name) LIKE '%brucelosis%' OR LOWER(vaccine_name) LIKE '%brucella%' THEN 'brucelosis'
  WHEN LOWER(vaccine_name) LIKE '%rabia%' OR LOWER(vaccine_name) LIKE '%rabies%' THEN 'rabia'
  WHEN LOWER(vaccine_name) LIKE '%carbunco%' OR LOWER(vaccine_name) LIKE '%anthrax%' OR LOWER(vaccine_name) LIKE '%antrax%' THEN 'anthrax'
  WHEN LOWER(vaccine_name) LIKE '%clostrid%' THEN 'clostridiosis'
  WHEN LOWER(vaccine_name) LIKE '%triple%' OR LOWER(vaccine_name) LIKE '%viral%' THEN 'triple_viral'
  ELSE 'other'
END
WHERE vaccine_code IS NULL;

-- Make NOT NULL after populating
ALTER TABLE cabaña_vaccination_requirements 
ALTER COLUMN vaccine_code SET NOT NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vaccine_requirements_code 
ON cabaña_vaccination_requirements(cabaña_id, vaccine_code, is_active);

-- 2. Ensure animal_vaccines has consistent vaccine_code
-- ============================================================================
UPDATE animal_vaccines av
SET vaccine_code = req.vaccine_code
FROM cabaña_vaccination_requirements req
WHERE av.requirement_id = req.id
  AND av.requirement_id IS NOT NULL
  AND av.vaccine_code != req.vaccine_code;

-- 3. Migrate data from vacunas_historial to animal_vaccines (avoid duplicates)
-- ============================================================================
INSERT INTO animal_vaccines (
  animal_id, cabaña_id, vaccine_code, date, lot, dose, route, 
  dose_number, requirement_id, created_by, created_at
)
SELECT 
  vh.animal_id,
  vh.cabaña_id,
  CASE 
    WHEN LOWER(vh.vacuna) LIKE '%aftosa%' OR LOWER(vh.vacuna) LIKE '%fmd%' THEN 'fmd'
    WHEN LOWER(vh.vacuna) LIKE '%brucelosis%' OR LOWER(vh.vacuna) LIKE '%brucella%' THEN 'brucelosis'
    WHEN LOWER(vh.vacuna) LIKE '%rabia%' OR LOWER(vh.vacuna) LIKE '%rabies%' THEN 'rabia'
    WHEN LOWER(vh.vacuna) LIKE '%carbunco%' OR LOWER(vh.vacuna) LIKE '%anthrax%' OR LOWER(vh.vacuna) LIKE '%antrax%' THEN 'anthrax'
    WHEN LOWER(vh.vacuna) LIKE '%clostrid%' THEN 'clostridiosis'
    WHEN LOWER(vh.vacuna) LIKE '%triple%' OR LOWER(vh.vacuna) LIKE '%viral%' THEN 'triple_viral'
    ELSE 'other'
  END as vaccine_code,
  vh.fecha,
  vh.lote,
  vh.dosis,
  vh.via,
  COALESCE(vh.dose_number, 1),
  (SELECT id FROM cabaña_vaccination_requirements 
   WHERE cabaña_id = vh.cabaña_id 
     AND LOWER(vaccine_name) = LOWER(vh.vacuna) 
   LIMIT 1) as requirement_id,
  (SELECT user_id FROM profiles WHERE cabaña_id = vh.cabaña_id LIMIT 1) as created_by,
  vh.created_at
FROM vacunas_historial vh
WHERE NOT EXISTS (
  SELECT 1 FROM animal_vaccines av 
  WHERE av.animal_id = vh.animal_id 
    AND av.date = vh.fecha 
    AND av.vaccine_code = CASE 
      WHEN LOWER(vh.vacuna) LIKE '%aftosa%' OR LOWER(vh.vacuna) LIKE '%fmd%' THEN 'fmd'
      WHEN LOWER(vh.vacuna) LIKE '%brucelosis%' OR LOWER(vh.vacuna) LIKE '%brucella%' THEN 'brucelosis'
      WHEN LOWER(vh.vacuna) LIKE '%rabia%' OR LOWER(vh.vacuna) LIKE '%rabies%' THEN 'rabia'
      WHEN LOWER(vh.vacuna) LIKE '%carbunco%' OR LOWER(vh.vacuna) LIKE '%anthrax%' OR LOWER(vh.vacuna) LIKE '%antrax%' THEN 'anthrax'
      WHEN LOWER(vh.vacuna) LIKE '%clostrid%' THEN 'clostridiosis'
      WHEN LOWER(vh.vacuna) LIKE '%triple%' OR LOWER(vh.vacuna) LIKE '%viral%' THEN 'triple_viral'
      ELSE 'other'
    END
)
ON CONFLICT DO NOTHING;

-- 4. Create function to calculate animal vaccination coverage
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_animal_vaccination_coverage(_animal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  animal_record record;
  animal_age_months integer;
  user_cabana_id uuid;
BEGIN
  SELECT a.* INTO animal_record
  FROM animals a
  WHERE a.id = _animal_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Animal not found');
  END IF;
  
  user_cabana_id := animal_record.cabaña_id;
  
  animal_age_months := EXTRACT(YEAR FROM AGE(CURRENT_DATE, animal_record.birth_date)) * 12 + 
                       EXTRACT(MONTH FROM AGE(CURRENT_DATE, animal_record.birth_date));
  
  WITH applicable_reqs AS (
    SELECT req.*
    FROM cabaña_vaccination_requirements req
    WHERE req.cabaña_id = user_cabana_id
      AND req.is_active = true
      AND (req.sex_restriction IS NULL OR req.sex_restriction = animal_record.sex)
      AND (req.min_age_months IS NULL OR animal_age_months >= req.min_age_months)
      AND (req.max_age_months IS NULL OR animal_age_months <= req.max_age_months)
  ),
  vaccination_status AS (
    SELECT 
      req.id as requirement_id,
      req.vaccine_name,
      req.frequency_months,
      av.date as last_date,
      av.date + (req.frequency_months * INTERVAL '1 month') as next_due,
      CASE 
        WHEN av.date IS NULL THEN 'pendiente'
        WHEN av.date + (req.frequency_months * INTERVAL '1 month') >= CURRENT_DATE THEN 'al_dia'
        WHEN av.date + (req.frequency_months * INTERVAL '1 month') < CURRENT_DATE - INTERVAL '30 days' THEN 'vencida'
        ELSE 'por_vencer'
      END as status
    FROM applicable_reqs req
    LEFT JOIN LATERAL (
      SELECT date 
      FROM animal_vaccines 
      WHERE animal_id = _animal_id 
        AND requirement_id = req.id 
      ORDER BY date DESC 
      LIMIT 1
    ) av ON true
  )
  SELECT jsonb_build_object(
    'animal_id', _animal_id,
    'applicable_requirements', COUNT(*),
    'fulfilled_requirements', COUNT(*) FILTER (WHERE status IN ('al_dia', 'por_vencer')),
    'overdue_requirements', COUNT(*) FILTER (WHERE status = 'vencida'),
    'pending_requirements', COUNT(*) FILTER (WHERE status = 'pendiente'),
    'percentage', ROUND(
      COALESCE(
        COUNT(*) FILTER (WHERE status IN ('al_dia', 'por_vencer'))::numeric / NULLIF(COUNT(*), 0) * 100,
        0
      ), 
      1
    ),
    'status', CASE 
      WHEN COUNT(*) = 0 THEN 'unknown'
      WHEN COUNT(*) FILTER (WHERE status IN ('al_dia', 'por_vencer'))::numeric / NULLIF(COUNT(*), 0) >= 0.9 THEN 'excellent'
      WHEN COUNT(*) FILTER (WHERE status IN ('al_dia', 'por_vencer'))::numeric / NULLIF(COUNT(*), 0) >= 0.7 THEN 'good'
      WHEN COUNT(*) FILTER (WHERE status IN ('al_dia', 'por_vencer'))::numeric / NULLIF(COUNT(*), 0) >= 0.5 THEN 'warning'
      ELSE 'critical'
    END,
    'details', COALESCE(jsonb_agg(
      jsonb_build_object(
        'requirement_id', requirement_id,
        'vaccine_name', vaccine_name,
        'status', status,
        'last_date', last_date,
        'next_due', next_due
      ) ORDER BY vaccine_name
    ) FILTER (WHERE requirement_id IS NOT NULL), '[]'::jsonb)
  ) INTO result
  FROM vaccination_status;
  
  RETURN result;
END;
$$;