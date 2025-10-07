-- Backfill animal_weight_history from animals table historical weights
-- This migration populates weight history from existing peso_nacimiento, peso_destete, and peso_final

-- First, create a function to backfill historical weights
CREATE OR REPLACE FUNCTION backfill_animal_weights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  animal_record RECORD;
  birth_weight_date DATE;
  weaning_weight_date DATE;
  final_weight_date DATE;
  age_at_weaning INTEGER := 180; -- días promedio destete
  age_at_final INTEGER := 540; -- días promedio peso final
BEGIN
  -- Loop through all animals with historical weights
  FOR animal_record IN 
    SELECT 
      id,
      cabaña_id,
      birth_date,
      peso_nacimiento,
      peso_destete,
      peso_final,
      fecha_destete
    FROM animals
    WHERE (peso_nacimiento IS NOT NULL OR peso_destete IS NOT NULL OR peso_final IS NOT NULL)
      AND birth_date IS NOT NULL
  LOOP
    -- Calculate dates for each weight type
    birth_weight_date := animal_record.birth_date;
    weaning_weight_date := COALESCE(animal_record.fecha_destete, animal_record.birth_date + age_at_weaning);
    final_weight_date := animal_record.birth_date + age_at_final;
    
    -- Insert birth weight
    IF animal_record.peso_nacimiento IS NOT NULL THEN
      INSERT INTO animal_weight_history (
        animal_id,
        cabaña_id,
        peso_kg,
        fecha,
        edad_dias,
        tipo_pesaje,
        peso_anterior,
        dias_desde_ultimo_pesaje,
        ganancia_diaria
      )
      SELECT
        animal_record.id,
        animal_record.cabaña_id,
        animal_record.peso_nacimiento,
        birth_weight_date,
        0,
        'nacimiento',
        NULL,
        NULL,
        NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM animal_weight_history
        WHERE animal_id = animal_record.id
          AND tipo_pesaje = 'nacimiento'
      );
    END IF;
    
    -- Insert weaning weight
    IF animal_record.peso_destete IS NOT NULL THEN
      INSERT INTO animal_weight_history (
        animal_id,
        cabaña_id,
        peso_kg,
        fecha,
        edad_dias,
        tipo_pesaje,
        peso_anterior,
        dias_desde_ultimo_pesaje,
        ganancia_diaria
      )
      SELECT
        animal_record.id,
        animal_record.cabaña_id,
        animal_record.peso_destete,
        weaning_weight_date,
        weaning_weight_date - birth_weight_date,
        'destete',
        animal_record.peso_nacimiento,
        CASE 
          WHEN animal_record.peso_nacimiento IS NOT NULL 
          THEN weaning_weight_date - birth_weight_date
          ELSE NULL
        END,
        CASE 
          WHEN animal_record.peso_nacimiento IS NOT NULL 
            AND (weaning_weight_date - birth_weight_date) > 0
          THEN ROUND(
            (animal_record.peso_destete - animal_record.peso_nacimiento) / 
            (weaning_weight_date - birth_weight_date)::numeric,
            3
          )
          ELSE NULL
        END
      WHERE NOT EXISTS (
        SELECT 1 FROM animal_weight_history
        WHERE animal_id = animal_record.id
          AND tipo_pesaje = 'destete'
      );
    END IF;
    
    -- Insert final weight
    IF animal_record.peso_final IS NOT NULL THEN
      INSERT INTO animal_weight_history (
        animal_id,
        cabaña_id,
        peso_kg,
        fecha,
        edad_dias,
        tipo_pesaje,
        peso_anterior,
        dias_desde_ultimo_pesaje,
        ganancia_diaria
      )
      SELECT
        animal_record.id,
        animal_record.cabaña_id,
        animal_record.peso_final,
        final_weight_date,
        final_weight_date - birth_weight_date,
        'final',
        COALESCE(animal_record.peso_destete, animal_record.peso_nacimiento),
        CASE 
          WHEN animal_record.peso_destete IS NOT NULL 
          THEN final_weight_date - weaning_weight_date
          WHEN animal_record.peso_nacimiento IS NOT NULL
          THEN final_weight_date - birth_weight_date
          ELSE NULL
        END,
        CASE 
          WHEN animal_record.peso_destete IS NOT NULL 
            AND (final_weight_date - weaning_weight_date) > 0
          THEN ROUND(
            (animal_record.peso_final - animal_record.peso_destete) / 
            (final_weight_date - weaning_weight_date)::numeric,
            3
          )
          WHEN animal_record.peso_nacimiento IS NOT NULL 
            AND (final_weight_date - birth_weight_date) > 0
          THEN ROUND(
            (animal_record.peso_final - animal_record.peso_nacimiento) / 
            (final_weight_date - birth_weight_date)::numeric,
            3
          )
          ELSE NULL
        END
      WHERE NOT EXISTS (
        SELECT 1 FROM animal_weight_history
        WHERE animal_id = animal_record.id
          AND tipo_pesaje = 'final'
      );
    END IF;
  END LOOP;
END;
$$;

-- Execute the backfill
SELECT backfill_animal_weights();

-- Create trigger to sync future updates from animals to animal_weight_history
CREATE OR REPLACE FUNCTION sync_animal_weights_to_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  birth_weight_date DATE;
  weaning_weight_date DATE;
  final_weight_date DATE;
  age_at_weaning INTEGER := 180;
  age_at_final INTEGER := 540;
BEGIN
  IF NEW.birth_date IS NULL THEN
    RETURN NEW;
  END IF;
  
  birth_weight_date := NEW.birth_date;
  weaning_weight_date := COALESCE(NEW.fecha_destete, NEW.birth_date + age_at_weaning);
  final_weight_date := NEW.birth_date + age_at_final;
  
  -- Sync birth weight
  IF NEW.peso_nacimiento IS NOT NULL AND (OLD.peso_nacimiento IS NULL OR OLD.peso_nacimiento != NEW.peso_nacimiento) THEN
    INSERT INTO animal_weight_history (
      animal_id, cabaña_id, peso_kg, fecha, edad_dias, tipo_pesaje
    ) VALUES (
      NEW.id, NEW.cabaña_id, NEW.peso_nacimiento, birth_weight_date, 0, 'nacimiento'
    )
    ON CONFLICT (animal_id, fecha, tipo_pesaje) 
    DO UPDATE SET peso_kg = NEW.peso_nacimiento;
  END IF;
  
  -- Sync weaning weight
  IF NEW.peso_destete IS NOT NULL AND (OLD.peso_destete IS NULL OR OLD.peso_destete != NEW.peso_destete) THEN
    INSERT INTO animal_weight_history (
      animal_id, cabaña_id, peso_kg, fecha, edad_dias, tipo_pesaje,
      peso_anterior, dias_desde_ultimo_pesaje, ganancia_diaria
    ) VALUES (
      NEW.id, NEW.cabaña_id, NEW.peso_destete, weaning_weight_date,
      weaning_weight_date - birth_weight_date, 'destete',
      NEW.peso_nacimiento,
      CASE WHEN NEW.peso_nacimiento IS NOT NULL THEN weaning_weight_date - birth_weight_date ELSE NULL END,
      CASE 
        WHEN NEW.peso_nacimiento IS NOT NULL AND (weaning_weight_date - birth_weight_date) > 0
        THEN ROUND((NEW.peso_destete - NEW.peso_nacimiento) / (weaning_weight_date - birth_weight_date)::numeric, 3)
        ELSE NULL
      END
    )
    ON CONFLICT (animal_id, fecha, tipo_pesaje) 
    DO UPDATE SET peso_kg = NEW.peso_destete;
  END IF;
  
  -- Sync final weight
  IF NEW.peso_final IS NOT NULL AND (OLD.peso_final IS NULL OR OLD.peso_final != NEW.peso_final) THEN
    INSERT INTO animal_weight_history (
      animal_id, cabaña_id, peso_kg, fecha, edad_dias, tipo_pesaje,
      peso_anterior, dias_desde_ultimo_pesaje, ganancia_diaria
    ) VALUES (
      NEW.id, NEW.cabaña_id, NEW.peso_final, final_weight_date,
      final_weight_date - birth_weight_date, 'final',
      COALESCE(NEW.peso_destete, NEW.peso_nacimiento),
      CASE 
        WHEN NEW.peso_destete IS NOT NULL THEN final_weight_date - weaning_weight_date
        WHEN NEW.peso_nacimiento IS NOT NULL THEN final_weight_date - birth_weight_date
        ELSE NULL
      END,
      CASE 
        WHEN NEW.peso_destete IS NOT NULL AND (final_weight_date - weaning_weight_date) > 0
        THEN ROUND((NEW.peso_final - NEW.peso_destete) / (final_weight_date - weaning_weight_date)::numeric, 3)
        WHEN NEW.peso_nacimiento IS NOT NULL AND (final_weight_date - birth_weight_date) > 0
        THEN ROUND((NEW.peso_final - NEW.peso_nacimiento) / (final_weight_date - birth_weight_date)::numeric, 3)
        ELSE NULL
      END
    )
    ON CONFLICT (animal_id, fecha, tipo_pesaje) 
    DO UPDATE SET peso_kg = NEW.peso_final;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on animals table
DROP TRIGGER IF EXISTS sync_animal_weights_trigger ON animals;
CREATE TRIGGER sync_animal_weights_trigger
  AFTER INSERT OR UPDATE OF peso_nacimiento, peso_destete, peso_final, birth_date, fecha_destete
  ON animals
  FOR EACH ROW
  EXECUTE FUNCTION sync_animal_weights_to_history();

-- Add unique constraint to prevent duplicate weight records
ALTER TABLE animal_weight_history 
DROP CONSTRAINT IF EXISTS unique_animal_weight_record;

ALTER TABLE animal_weight_history
ADD CONSTRAINT unique_animal_weight_record 
UNIQUE (animal_id, fecha, tipo_pesaje);