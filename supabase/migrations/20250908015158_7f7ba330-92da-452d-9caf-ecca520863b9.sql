-- Update pregnancies table to support proper state management
ALTER TABLE preñeces 
ADD COLUMN IF NOT EXISTS estado_final text CHECK (estado_final IN ('activa', 'exitosa', 'fallida')) DEFAULT 'activa',
ADD COLUMN IF NOT EXISTS fecha_finalizacion date,
ADD COLUMN IF NOT EXISTS motivo_finalizacion text,
ADD COLUMN IF NOT EXISTS cria_id uuid REFERENCES animals(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_preneces_estado_final ON preñeces(estado_final);
CREATE INDEX IF NOT EXISTS idx_preneces_animal_id_estado ON preñeces(animal_id, estado_final);

-- Update existing pregnancy records to have 'activa' state if currently pregnant
UPDATE preñeces 
SET estado_final = 'activa' 
WHERE estado_final IS NULL AND estado = 'confirmada';

-- Function to handle pregnancy completion when calf is born
CREATE OR REPLACE FUNCTION complete_pregnancy_on_birth()
RETURNS TRIGGER AS $$
DECLARE
  active_pregnancy_id uuid;
BEGIN
  -- Only process if this is a new animal with a mother
  IF TG_OP = 'INSERT' AND NEW.mother_id IS NOT NULL THEN
    -- Find active pregnancy for this mother
    SELECT id INTO active_pregnancy_id
    FROM preñeces 
    WHERE animal_id = NEW.mother_id 
      AND estado_final = 'activa'
    ORDER BY fecha_inicio DESC
    LIMIT 1;
    
    -- If found, mark as successful
    IF active_pregnancy_id IS NOT NULL THEN
      UPDATE preñeces 
      SET 
        estado_final = 'exitosa',
        fecha_finalizacion = NEW.birth_date,
        cria_id = NEW.id,
        motivo_finalizacion = 'parto_exitoso'
      WHERE id = active_pregnancy_id;
      
      -- Update mother's pregnancy status
      UPDATE animals 
      SET 
        esta_preñada = false,
        fecha_probable_parto = NULL
      WHERE id = NEW.mother_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic pregnancy completion
DROP TRIGGER IF EXISTS trigger_complete_pregnancy_on_birth ON animals;
CREATE TRIGGER trigger_complete_pregnancy_on_birth
  AFTER INSERT ON animals
  FOR EACH ROW
  EXECUTE FUNCTION complete_pregnancy_on_birth();

-- Function to check overdue pregnancies and create alerts
CREATE OR REPLACE FUNCTION check_overdue_pregnancies()
RETURNS void AS $$
DECLARE
  pregnancy_record RECORD;
BEGIN
  -- Check for pregnancies overdue by 3+ weeks (21 days)
  FOR pregnancy_record IN
    SELECT p.id, p.animal_id, p.cabaña_id, p.fecha_estimada_parto, a.id_tag
    FROM preñeces p
    JOIN animals a ON p.animal_id = a.id
    WHERE p.estado_final = 'activa'
      AND p.fecha_estimada_parto IS NOT NULL
      AND p.fecha_estimada_parto + INTERVAL '21 days' < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM reproductive_alerts ra 
        WHERE ra.animal_id = p.animal_id 
          AND ra.alert_type = 'overdue_pregnancy_resolution'
          AND ra.status = 'pending'
      )
  LOOP
    -- Create alert for overdue pregnancy resolution
    INSERT INTO reproductive_alerts (
      animal_id, 
      cabaña_id, 
      alert_type, 
      expected_date, 
      days_overdue,
      notes
    ) VALUES (
      pregnancy_record.animal_id,
      pregnancy_record.cabaña_id,
      'overdue_pregnancy_resolution',
      pregnancy_record.fecha_estimada_parto,
      CURRENT_DATE - pregnancy_record.fecha_estimada_parto,
      'Preñez requiere resolución: marcar como exitosa o fallida'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually mark pregnancy as failed
CREATE OR REPLACE FUNCTION mark_pregnancy_failed(
  _pregnancy_id uuid,
  _reason text DEFAULT 'perdida_prenez'
)
RETURNS boolean AS $$
DECLARE
  pregnancy_animal_id uuid;
BEGIN
  -- Get animal id and update pregnancy
  UPDATE preñeces 
  SET 
    estado_final = 'fallida',
    fecha_finalizacion = CURRENT_DATE,
    motivo_finalizacion = _reason
  WHERE id = _pregnancy_id AND estado_final = 'activa'
  RETURNING animal_id INTO pregnancy_animal_id;
  
  -- If pregnancy was updated, update animal status
  IF pregnancy_animal_id IS NOT NULL THEN
    UPDATE animals 
    SET 
      esta_preñada = false,
      fecha_probable_parto = NULL
    WHERE id = pregnancy_animal_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;