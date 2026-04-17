-- Fix functions still looking up cabaña only in legacy public.users.
-- Pattern: read from public.profiles first, fall back to public.users.

-- 1) get_current_user_cabana (singular) — make consistent with get_current_user_cabana_id
CREATE OR REPLACE FUNCTION public.get_current_user_cabana()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT cabaña_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT cabaña_id FROM public.users    WHERE id      = auth.uid() LIMIT 1)
  );
$function$;

-- 2) actualizar_estado_preñez trigger
CREATE OR REPLACE FUNCTION public."actualizar_estado_preñez"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  resultado_animal JSONB;
  animal_id_actual UUID;
  resultado_actual TEXT;
  user_cabana_id UUID;
BEGIN
  SELECT cabaña_id INTO user_cabana_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF user_cabana_id IS NULL THEN
    SELECT cabaña_id INTO user_cabana_id FROM public.users WHERE id = auth.uid() LIMIT 1;
  END IF;

  FOR resultado_animal IN SELECT jsonb_array_elements(NEW.resultados)
  LOOP
    animal_id_actual := (resultado_animal->>'animal_id')::UUID;
    resultado_actual := resultado_animal->>'resultado';

    IF resultado_actual = 'preñada' THEN
      UPDATE public.animals
      SET esta_preñada = TRUE,
          fecha_ultima_preñez = (SELECT fecha FROM public.eventos WHERE id = NEW.evento_id)
      WHERE id = animal_id_actual;

      UPDATE public.preñeces
      SET estado = 'confirmada', updated_at = now()
      WHERE animal_id = animal_id_actual
        AND estado = 'pendiente'
        AND cabaña_id = user_cabana_id;
    ELSE
      UPDATE public.animals SET esta_preñada = FALSE WHERE id = animal_id_actual;

      UPDATE public.preñeces
      SET estado = 'perdida', updated_at = now()
      WHERE animal_id = animal_id_actual
        AND estado IN ('pendiente', 'confirmada')
        AND cabaña_id = user_cabana_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 3) crear_preñeces_ia trigger
CREATE OR REPLACE FUNCTION public."crear_preñeces_ia"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  animal_id_actual UUID;
  fecha_ia DATE;
  user_cabana_id UUID;
BEGIN
  SELECT cabaña_id INTO user_cabana_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF user_cabana_id IS NULL THEN
    SELECT cabaña_id INTO user_cabana_id FROM public.users WHERE id = auth.uid() LIMIT 1;
  END IF;

  SELECT fecha INTO fecha_ia FROM public.eventos WHERE id = NEW.evento_id LIMIT 1;

  FOREACH animal_id_actual IN ARRAY NEW.animales_ids
  LOOP
    INSERT INTO public.preñeces (
      animal_id, cabaña_id, origen, fecha_inicio, fecha_estimada_parto, estado, evento_id
    ) VALUES (
      animal_id_actual, user_cabana_id, 'IA', fecha_ia,
      fecha_ia + INTERVAL '283 days', 'pendiente', NEW.evento_id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 4) update_pregnancy_status RPC
CREATE OR REPLACE FUNCTION public.update_pregnancy_status(
  _user_id uuid,
  _service_animal_ids uuid[],
  _estado text,
  _result_source text DEFAULT 'manual'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_cabana_id UUID;
  service_animal_id UUID;
  animal_id UUID;
  updated_count INTEGER := 0;
BEGIN
  IF _estado NOT IN ('preñada', 'vacía', 'pendiente') THEN
    RAISE EXCEPTION 'Estado inválido: %', _estado;
  END IF;

  SELECT cabaña_id INTO user_cabana_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  IF user_cabana_id IS NULL THEN
    SELECT cabaña_id INTO user_cabana_id FROM public.users WHERE id = _user_id LIMIT 1;
  END IF;
  IF user_cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;

  FOREACH service_animal_id IN ARRAY _service_animal_ids
  LOOP
    SELECT isa.animal_id INTO animal_id
    FROM public.ia_service_animals isa
    WHERE isa.id = service_animal_id
      AND isa.cabaña_id = user_cabana_id;

    IF animal_id IS NULL THEN
      RAISE EXCEPTION 'Registro de servicio % no encontrado o sin permisos', service_animal_id;
    END IF;

    UPDATE public.ia_service_animals
    SET estado = _estado,
        result_source = _result_source,
        updated_by = _user_id,
        updated_at = now()
    WHERE id = service_animal_id;

    IF _estado = 'preñada' THEN
      UPDATE public.animals
      SET esta_preñada = TRUE, fecha_ultima_preñez = CURRENT_DATE
      WHERE id = animal_id;
    ELSIF _estado = 'vacía' THEN
      UPDATE public.animals
      SET esta_preñada = FALSE
      WHERE id = animal_id;
    END IF;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN jsonb_build_object('updated_count', updated_count, 'success', true);
END;
$function$;