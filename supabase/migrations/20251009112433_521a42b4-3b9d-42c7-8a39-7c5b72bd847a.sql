-- Function to synchronize animal weights to history
CREATE OR REPLACE FUNCTION public.sync_animal_weights_to_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  birth_weight_date DATE;
  weaning_weight_date DATE;
  final_weight_date DATE;
BEGIN
  -- Only process if we have a birth date
  IF NEW.birth_date IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Birth weight - same as birth date
  IF NEW.peso_nacimiento IS NOT NULL AND NEW.peso_nacimiento > 0 THEN
    birth_weight_date := NEW.birth_date;
    
    -- Check if birth weight record already exists
    IF NOT EXISTS (
      SELECT 1 FROM animal_weight_history 
      WHERE animal_id = NEW.id 
        AND tipo_pesaje = 'nacimiento'
    ) THEN
      INSERT INTO animal_weight_history (
        animal_id,
        cabaña_id,
        peso_kg,
        fecha,
        edad_dias,
        tipo_pesaje,
        peso_anterior,
        dias_desde_ultimo_pesaje,
        ganancia_diaria,
        notas
      ) VALUES (
        NEW.id,
        NEW.cabaña_id,
        NEW.peso_nacimiento,
        birth_weight_date,
        0,
        'nacimiento',
        NULL,
        NULL,
        NULL,
        'Peso de nacimiento sincronizado'
      );
    END IF;
  END IF;
  
  -- Weaning weight - calculate date (approx 210 days = 7 months)
  IF NEW.peso_destete IS NOT NULL AND NEW.peso_destete > 0 THEN
    -- Use fecha_destete if available, otherwise calculate
    weaning_weight_date := COALESCE(NEW.fecha_destete, NEW.birth_date + INTERVAL '210 days');
    
    -- Check if weaning weight record already exists
    IF NOT EXISTS (
      SELECT 1 FROM animal_weight_history 
      WHERE animal_id = NEW.id 
        AND tipo_pesaje = 'destete'
    ) THEN
      INSERT INTO animal_weight_history (
        animal_id,
        cabaña_id,
        peso_kg,
        fecha,
        edad_dias,
        tipo_pesaje,
        peso_anterior,
        dias_desde_ultimo_pesaje,
        ganancia_diaria,
        notas
      ) VALUES (
        NEW.id,
        NEW.cabaña_id,
        NEW.peso_destete,
        weaning_weight_date,
        weaning_weight_date - NEW.birth_date,
        'destete',
        NEW.peso_nacimiento,
        CASE 
          WHEN NEW.peso_nacimiento IS NOT NULL 
          THEN weaning_weight_date - birth_weight_date
          ELSE NULL 
        END,
        CASE 
          WHEN NEW.peso_nacimiento IS NOT NULL AND weaning_weight_date > birth_weight_date
          THEN ROUND((NEW.peso_destete - NEW.peso_nacimiento) / (weaning_weight_date - birth_weight_date)::NUMERIC, 3)
          ELSE NULL 
        END,
        'Peso al destete sincronizado'
      );
    END IF;
  END IF;
  
  -- Final weight - calculate date (approx 18 months = 540 days from birth)
  IF NEW.peso_final IS NOT NULL AND NEW.peso_final > 0 THEN
    final_weight_date := NEW.birth_date + INTERVAL '540 days';
    
    -- Check if final weight record already exists
    IF NOT EXISTS (
      SELECT 1 FROM animal_weight_history 
      WHERE animal_id = NEW.id 
        AND tipo_pesaje = 'final'
    ) THEN
      INSERT INTO animal_weight_history (
        animal_id,
        cabaña_id,
        peso_kg,
        fecha,
        edad_dias,
        tipo_pesaje,
        peso_anterior,
        dias_desde_ultimo_pesaje,
        ganancia_diaria,
        notas
      ) VALUES (
        NEW.id,
        NEW.cabaña_id,
        NEW.peso_final,
        final_weight_date,
        540,
        'final',
        COALESCE(NEW.peso_destete, NEW.peso_nacimiento),
        CASE 
          WHEN NEW.peso_destete IS NOT NULL 
          THEN final_weight_date - weaning_weight_date
          WHEN NEW.peso_nacimiento IS NOT NULL 
          THEN final_weight_date - birth_weight_date
          ELSE NULL 
        END,
        CASE 
          WHEN NEW.peso_destete IS NOT NULL AND final_weight_date > weaning_weight_date
          THEN ROUND((NEW.peso_final - NEW.peso_destete) / (final_weight_date - weaning_weight_date)::NUMERIC, 3)
          WHEN NEW.peso_nacimiento IS NOT NULL AND final_weight_date > birth_weight_date
          THEN ROUND((NEW.peso_final - NEW.peso_nacimiento) / (final_weight_date - birth_weight_date)::NUMERIC, 3)
          ELSE NULL 
        END,
        'Peso final sincronizado'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS sync_weights_on_insert ON public.animals;
CREATE TRIGGER sync_weights_on_insert
  AFTER INSERT ON public.animals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_animal_weights_to_history();

-- Create trigger for UPDATE operations  
DROP TRIGGER IF EXISTS sync_weights_on_update ON public.animals;
CREATE TRIGGER sync_weights_on_update
  AFTER UPDATE OF peso_nacimiento, peso_destete, peso_final, birth_date, fecha_destete ON public.animals
  FOR EACH ROW
  WHEN (
    OLD.peso_nacimiento IS DISTINCT FROM NEW.peso_nacimiento OR
    OLD.peso_destete IS DISTINCT FROM NEW.peso_destete OR
    OLD.peso_final IS DISTINCT FROM NEW.peso_final OR
    OLD.birth_date IS DISTINCT FROM NEW.birth_date OR
    OLD.fecha_destete IS DISTINCT FROM NEW.fecha_destete
  )
  EXECUTE FUNCTION public.sync_animal_weights_to_history();