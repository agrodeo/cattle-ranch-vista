-- Create trigger to update animal pregnancy status when tacto is recorded
CREATE OR REPLACE FUNCTION public.update_animal_pregnancy_from_tacto()
RETURNS TRIGGER AS $$
DECLARE
  tacto_result RECORD;
  animal_result JSONB;
BEGIN
  -- Process each result in the tactos record
  FOR animal_result IN SELECT * FROM jsonb_array_elements(NEW.resultados)
  LOOP
    -- Update animal pregnancy status based on tacto result
    UPDATE public.animals 
    SET 
      esta_preñada = CASE 
        WHEN (animal_result->>'resultado')::text = 'preñada' THEN true
        WHEN (animal_result->>'resultado')::text = 'vacia' THEN false
        ELSE esta_preñada -- Keep existing value for other results
      END,
      fecha_ultima_preñez = CASE 
        WHEN (animal_result->>'resultado')::text = 'preñada' THEN 
          (SELECT e.fecha FROM public.eventos e WHERE e.id = NEW.evento_id)
        ELSE fecha_ultima_preñez -- Keep existing value
      END,
      fecha_probable_parto = CASE 
        WHEN (animal_result->>'resultado')::text = 'preñada' THEN 
          (SELECT e.fecha + INTERVAL '283 days' FROM public.eventos e WHERE e.id = NEW.evento_id)
        WHEN (animal_result->>'resultado')::text = 'vacia' THEN NULL
        ELSE fecha_probable_parto -- Keep existing value
      END
    WHERE id = (animal_result->>'animal_id')::uuid;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tactos table
CREATE TRIGGER trigger_update_pregnancy_from_tacto
    AFTER INSERT OR UPDATE ON public.tactos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_animal_pregnancy_from_tacto();

-- Also create trigger to update pregnancy status from preñeces table
CREATE OR REPLACE FUNCTION public.update_animal_pregnancy_from_pregneces()
RETURNS TRIGGER AS $$
BEGIN
  -- Update animal pregnancy status based on preñeces estado
  UPDATE public.animals 
  SET 
    esta_preñada = CASE 
      WHEN NEW.estado = 'confirmada' THEN true
      WHEN NEW.estado = 'fallida' OR NEW.estado = 'abortada' THEN false
      ELSE esta_preñada -- Keep existing value for pending
    END,
    fecha_ultima_preñez = CASE 
      WHEN NEW.estado = 'confirmada' THEN NEW.fecha_inicio
      ELSE fecha_ultima_preñez
    END,
    fecha_probable_parto = CASE 
      WHEN NEW.estado = 'confirmada' THEN NEW.fecha_estimada_parto
      WHEN NEW.estado = 'fallida' OR NEW.estado = 'abortada' THEN NULL
      ELSE fecha_probable_parto
    END
  WHERE id = NEW.animal_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on preñeces table
CREATE TRIGGER trigger_update_pregnancy_from_pregneces
    AFTER INSERT OR UPDATE ON public.preñeces
    FOR EACH ROW
    EXECUTE FUNCTION public.update_animal_pregnancy_from_pregneces();