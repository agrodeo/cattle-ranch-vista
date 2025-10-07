-- Fix backfill to ensure different dates for each weight type
DROP FUNCTION IF EXISTS backfill_animal_weights();

CREATE OR REPLACE FUNCTION backfill_animal_weights_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  animal_record RECORD;
  birth_weight_date DATE;
  weaning_weight_date DATE;
  final_weight_date DATE;
  age_at_weaning INTEGER := 180; -- días promedio destete
  age_at_final INTEGER := 540; -- días promedio peso final
BEGIN
  -- First, delete existing backfilled records to avoid conflicts
  DELETE FROM animal_weight_history 
  WHERE evento_id IS NULL;
  
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
    -- Calculate dates for each weight type - ensuring they are DIFFERENT
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
      ) VALUES (
        animal_record.id,
        animal_record.cabaña_id,
        animal_record.peso_nacimiento,
        birth_weight_date,
        0,
        'nacimiento',
        NULL,
        NULL,
        NULL
      );
    END IF;
    
    -- Insert weaning weight ONLY if date is different from birth
    IF animal_record.peso_destete IS NOT NULL AND weaning_weight_date > birth_weight_date THEN
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
      ) VALUES (
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
      );
    END IF;
    
    -- Insert final weight ONLY if date is different from previous weights
    IF animal_record.peso_final IS NOT NULL 
       AND final_weight_date > COALESCE(weaning_weight_date, birth_weight_date) THEN
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
      ) VALUES (
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
      );
    END IF;
  END LOOP;
END;
$$;

-- Execute the improved backfill
SELECT backfill_animal_weights_v2();