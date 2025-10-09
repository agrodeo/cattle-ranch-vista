-- Improve sync_animal_weights_to_history to handle weaning dates better
CREATE OR REPLACE FUNCTION public.sync_animal_weights_to_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  
  -- Weaning weight - use fecha_destete if available, otherwise calculate
  IF NEW.peso_destete IS NOT NULL AND NEW.peso_destete > 0 THEN
    -- Priority 1: Use fecha_destete if available and valid
    IF NEW.fecha_destete IS NOT NULL AND NEW.fecha_destete >= NEW.birth_date THEN
      weaning_weight_date := NEW.fecha_destete;
    -- Priority 2: Calculate from birth (210 days = approx 7 months)
    ELSE
      weaning_weight_date := NEW.birth_date + INTERVAL '210 days';
    END IF;
    
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
          WHEN NEW.peso_nacimiento IS NOT NULL AND birth_weight_date IS NOT NULL
          THEN weaning_weight_date - birth_weight_date
          ELSE NULL 
        END,
        CASE 
          WHEN NEW.peso_nacimiento IS NOT NULL AND birth_weight_date IS NOT NULL AND weaning_weight_date > birth_weight_date
          THEN ROUND((NEW.peso_destete - NEW.peso_nacimiento) / (weaning_weight_date - birth_weight_date)::NUMERIC, 3)
          ELSE NULL 
        END,
        CASE 
          WHEN NEW.fecha_destete IS NOT NULL THEN 'Peso al destete (fecha registrada)'
          ELSE 'Peso al destete (fecha estimada)'
        END
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
          WHEN NEW.peso_destete IS NOT NULL AND weaning_weight_date IS NOT NULL
          THEN final_weight_date - weaning_weight_date
          WHEN NEW.peso_nacimiento IS NOT NULL AND birth_weight_date IS NOT NULL
          THEN final_weight_date - birth_weight_date
          ELSE NULL 
        END,
        CASE 
          WHEN NEW.peso_destete IS NOT NULL AND weaning_weight_date IS NOT NULL AND final_weight_date > weaning_weight_date
          THEN ROUND((NEW.peso_final - NEW.peso_destete) / (final_weight_date - weaning_weight_date)::NUMERIC, 3)
          WHEN NEW.peso_nacimiento IS NOT NULL AND birth_weight_date IS NOT NULL AND final_weight_date > birth_weight_date
          THEN ROUND((NEW.peso_final - NEW.peso_nacimiento) / (final_weight_date - birth_weight_date)::NUMERIC, 3)
          ELSE NULL 
        END,
        'Peso final sincronizado'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;