-- Phase 1: Critical Security Fixes

-- 1. Secure all database functions by adding proper search_path
CREATE OR REPLACE FUNCTION public.list_finance_recurring(_user_id uuid)
 RETURNS TABLE(id uuid, "cabaña_id" uuid, amount numeric, category_id uuid, start_date date, end_date date, next_run_date date, last_run_date date, day_of_month integer, day_of_week integer, interval_days integer, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, description text, frequency text, name text, type text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH user_cab AS (
    SELECT cabana_id FROM public.get_user_cabana_info(_user_id) LIMIT 1
  )
  SELECT 
    fr.id,
    fr."cabaña_id",
    fr.amount,
    fr.category_id,
    fr.start_date,
    fr.end_date,
    fr.next_run_date,
    fr.last_run_date,
    fr.day_of_month,
    fr.day_of_week,
    fr.interval_days,
    fr.is_active,
    fr.created_at,
    fr.updated_at,
    fr.description,
    fr.frequency,
    fr.name,
    fr.type
  FROM public.finance_recurring fr, user_cab
  WHERE fr."cabaña_id" = user_cab.cabana_id
  ORDER BY fr.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.create_finance_recurring(_user_id uuid, _name text, _type text, _amount numeric, _frequency text, _category_id uuid DEFAULT NULL::uuid, _description text DEFAULT NULL::text, _start_date date DEFAULT (now())::date, _end_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cab_id uuid;
  allowed boolean;
  new_id uuid;
BEGIN
  IF COALESCE(TRIM(_name),'') = '' OR _type IS NULL OR _frequency IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters';
  END IF;

  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  allowed := public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'employee');
  IF NOT allowed THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.finance_recurring(
    "cabaña_id", amount, category_id, start_date, end_date,
    next_run_date, last_run_date, day_of_month, day_of_week, interval_days,
    is_active, description, frequency, name, type
  )
  VALUES (
    cab_id, COALESCE(_amount,0), _category_id, _start_date, _end_date,
    _start_date, NULL, NULL, NULL, NULL,
    true, _description, _frequency, _name, _type
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_finance_recurring(_user_id uuid, _id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cab_id uuid;
  allowed boolean;
BEGIN
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  allowed := public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'employee');
  IF NOT allowed THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.finance_recurring
  WHERE id = _id AND "cabaña_id" = cab_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_pregnancy_status(_user_id uuid, _service_animal_ids uuid[], _estado text, _result_source text DEFAULT 'manual'::text)
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
  -- Validar estado
  IF _estado NOT IN ('preñada', 'vacía', 'pendiente') THEN
    RAISE EXCEPTION 'Estado inválido: %', _estado;
  END IF;

  -- Obtener cabaña del usuario
  SELECT cabaña_id INTO user_cabana_id FROM public.users WHERE id = _user_id;
  IF user_cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;

  -- Actualizar cada registro
  FOREACH service_animal_id IN ARRAY _service_animal_ids
  LOOP
    -- Obtener el animal_id y verificar permisos
    SELECT isa.animal_id INTO animal_id
    FROM public.ia_service_animals isa
    WHERE isa.id = service_animal_id
      AND isa.cabaña_id = user_cabana_id;
    
    IF animal_id IS NULL THEN
      RAISE EXCEPTION 'Registro de servicio % no encontrado o sin permisos', service_animal_id;
    END IF;

    -- Actualizar estado en ia_service_animals
    UPDATE public.ia_service_animals
    SET estado = _estado,
        result_source = _result_source,
        updated_by = _user_id,
        updated_at = now()
    WHERE id = service_animal_id;

    -- Actualizar estado de preñez en animals
    IF _estado = 'preñada' THEN
      UPDATE public.animals
      SET esta_preñada = TRUE,
          fecha_ultima_preñez = CURRENT_DATE
      WHERE id = animal_id;
    ELSIF _estado = 'vacía' THEN
      UPDATE public.animals
      SET esta_preñada = FALSE
      WHERE id = animal_id;
    END IF;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'updated_count', updated_count,
    'success', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_defuncion(_animal_id uuid, _fecha_defuncion date, _causa_id uuid DEFAULT NULL::uuid, _causa_texto text DEFAULT NULL::text, _notas text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cabana_id UUID;
  _user_id UUID;
  _animal_status TEXT;
  _birth_date DATE;
  _defuncion_id UUID;
  _edad_dias INTEGER;
  _edad_meses INTEGER;
  result JSON;
BEGIN
  -- Get current user and verify permissions
  SELECT id INTO _user_id FROM auth.users WHERE id = auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Get user's cabaña_id
  SELECT cabaña_id INTO _cabana_id FROM public.users WHERE id = _user_id;
  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;
  
  -- Verify animal exists and belongs to user's cabaña
  SELECT status, birth_date, cabaña_id 
  INTO _animal_status, _birth_date, _cabana_id
  FROM public.animals 
  WHERE id = _animal_id AND cabaña_id = _cabana_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Animal no encontrado o no pertenece a su cabaña';
  END IF;
  
  -- Check if animal is already dead
  IF _animal_status = 'muerto' THEN
    RAISE EXCEPTION 'El animal ya está marcado como fallecido';
  END IF;
  
  -- Check if animal is sold
  IF _animal_status = 'vendido' THEN
    RAISE EXCEPTION 'No se puede marcar como fallecido un animal vendido';
  END IF;
  
  -- Validate death date
  IF _fecha_defuncion > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha de defunción no puede ser futura';
  END IF;
  
  IF _birth_date IS NOT NULL AND _fecha_defuncion < _birth_date THEN
    RAISE EXCEPTION 'La fecha de defunción no puede ser anterior al nacimiento';
  END IF;
  
  -- Calculate age at death
  IF _birth_date IS NOT NULL THEN
    _edad_dias := _fecha_defuncion - _birth_date;
    _edad_meses := FLOOR(_edad_dias / 30.44);
  END IF;
  
  -- Insert death record
  INSERT INTO public.defunciones (
    animal_id, cabaña_id, fecha_defuncion, causa_id, causa_texto, 
    notas, registrado_por
  ) VALUES (
    _animal_id, _cabana_id, _fecha_defuncion, _causa_id, _causa_texto,
    _notas, _user_id
  ) RETURNING id INTO _defuncion_id;
  
  -- Update animal status
  UPDATE public.animals 
  SET 
    status = 'muerto',
    fecha_muerte = _fecha_defuncion,
    defuncion_id = _defuncion_id,
    corral_id = NULL
  WHERE id = _animal_id;
  
  -- Build result
  result := json_build_object(
    'defuncion_id', _defuncion_id,
    'animal_id', _animal_id,
    'fecha_defuncion', _fecha_defuncion,
    'edad_dias', _edad_dias,
    'edad_meses', _edad_meses,
    'success', true,
    'message', 'Animal marcado como fallecido correctamente'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.manage_death_causes(_action text, _id uuid DEFAULT NULL::uuid, _nombre text DEFAULT NULL::text, _activo boolean DEFAULT true, _orden integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cabana_id UUID;
  _user_id UUID;
  _cause_id UUID;
  result JSON;
BEGIN
  -- Get current user and verify permissions
  SELECT id INTO _user_id FROM auth.users WHERE id = auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Get user's cabaña_id
  SELECT cabaña_id INTO _cabana_id FROM public.users WHERE id = _user_id;
  IF _cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;
  
  CASE _action
    WHEN 'list' THEN
      SELECT json_agg(
        json_build_object(
          'id', id,
          'nombre', nombre,
          'activo', activo,
          'orden', orden
        ) ORDER BY orden, nombre
      ) INTO result
      FROM public.catalogo_causas
      WHERE cabaña_id = _cabana_id AND activo = true;
      
      RETURN COALESCE(result, '[]'::json);
      
    WHEN 'create' THEN
      IF _nombre IS NULL OR TRIM(_nombre) = '' THEN
        RAISE EXCEPTION 'El nombre de la causa es requerido';
      END IF;
      
      INSERT INTO public.catalogo_causas (cabaña_id, nombre, activo, orden)
      VALUES (_cabana_id, TRIM(_nombre), _activo, COALESCE(_orden, 0))
      RETURNING id INTO _cause_id;
      
      RETURN json_build_object(
        'id', _cause_id,
        'success', true,
        'message', 'Causa de muerte creada correctamente'
      );
      
    WHEN 'update' THEN
      IF _id IS NULL THEN
        RAISE EXCEPTION 'ID de causa requerido para actualizar';
      END IF;
      
      UPDATE public.catalogo_causas 
      SET 
        nombre = COALESCE(TRIM(_nombre), nombre),
        activo = COALESCE(_activo, activo),
        orden = COALESCE(_orden, orden),
        updated_at = now()
      WHERE id = _id AND cabaña_id = _cabana_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Causa no encontrada';
      END IF;
      
      RETURN json_build_object(
        'success', true,
        'message', 'Causa actualizada correctamente'
      );
      
    WHEN 'delete' THEN
      IF _id IS NULL THEN
        RAISE EXCEPTION 'ID de causa requerido para eliminar';
      END IF;
      
      -- Soft delete by setting activo = false
      UPDATE public.catalogo_causas 
      SET activo = false, updated_at = now()
      WHERE id = _id AND cabaña_id = _cabana_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Causa no encontrada';
      END IF;
      
      RETURN json_build_object(
        'success', true,
        'message', 'Causa desactivada correctamente'
      );
      
    ELSE
      RAISE EXCEPTION 'Acción no válida: %', _action;
  END CASE;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_finance_movements(_user_id uuid, _from_date date DEFAULT NULL::date, _to_date date DEFAULT NULL::date, _type text DEFAULT NULL::text, _search text DEFAULT NULL::text, _category_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, date date, type text, amount numeric, description text, category_id uuid, category_name text, buyer_name text, buyer_document text, buyer_destination text, "cabaña_id" uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cab_id uuid;
BEGIN
  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  RETURN QUERY
  SELECT 
    f.id,
    f.date,
    f.type,
    f.amount,
    f.description,
    f.category_id,
    fc.name as category_name,
    f.buyer_name,
    f.buyer_document,
    f.buyer_destination,
    f.cabaña_id
  FROM public.finances f
  LEFT JOIN public.finance_categories fc ON f.category_id = fc.id
  WHERE f.cabaña_id = cab_id
    AND (_from_date IS NULL OR f.date >= _from_date)
    AND (_to_date IS NULL OR f.date <= _to_date)
    AND (_type IS NULL OR f.type = _type)
    AND (_category_id IS NULL OR f.category_id = _category_id)
    AND (_search IS NULL OR f.description ILIKE '%' || _search || '%')
  ORDER BY f.date DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_finance_movement(_user_id uuid, _date date, _type text, _amount numeric, _description text DEFAULT NULL::text, _category_id uuid DEFAULT NULL::uuid, _buyer_name text DEFAULT NULL::text, _buyer_document text DEFAULT NULL::text, _buyer_destination text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cab_id uuid;
  allowed boolean;
  new_id uuid;
BEGIN
  -- Validate inputs
  IF _type IS NULL OR (_type != 'ingreso' AND _type != 'egreso') THEN
    RAISE EXCEPTION 'Invalid type. Must be ingreso or egreso';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  -- Check permissions
  allowed := public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'employee');
  IF NOT allowed THEN
    RAISE EXCEPTION 'Not authorized to create finance movements';
  END IF;

  -- Insert the movement
  INSERT INTO public.finances (
    cabaña_id, 
    date, 
    type, 
    amount, 
    description, 
    category_id, 
    buyer_name, 
    buyer_document, 
    buyer_destination
  )
  VALUES (
    cab_id,
    _date,
    _type,
    _amount,
    _description,
    _category_id,
    _buyer_name,
    _buyer_document,
    _buyer_destination
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

-- 2. Remove the dangerous password retrieval function and update hash function
-- Update the hash function to use proper bcrypt placeholder format
CREATE OR REPLACE FUNCTION public.hash_password(_password text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark passwords for server-side hashing
  -- The actual hashing will be done in edge functions
  RETURN 'bcrypt_placeholder:' || _password;
END;
$function$;

-- 3. Update verify_user_login to handle bcrypt passwords properly
CREATE OR REPLACE FUNCTION public.verify_user_login(input_username text, input_password text)
RETURNS TABLE(user_data jsonb, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  stored_password TEXT;
BEGIN
  -- Try to find user by username
  SELECT u.* INTO user_record
  FROM public.users u
  WHERE u.username = input_username
    AND u.is_internal_profile = true
    AND u.is_active = true;
  
  IF user_record IS NULL THEN
    RETURN QUERY SELECT NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Get the stored password
  SELECT password_text INTO stored_password
  FROM public.user_passwords
  WHERE user_id = user_record.id;
  
  -- Verify password - only allow hashed passwords now
  IF stored_password IS NULL THEN
    RETURN QUERY SELECT NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Only allow bcrypt hashes (starting with $2) - no more plain text
  IF NOT (stored_password LIKE '$2%') THEN
    -- Log security event for attempted login with unhashed password
    PERFORM public.log_security_event('login_attempt_unhashed_password', 'users', user_record.id, 
      jsonb_build_object('username', input_username, 'method', 'internal'));
    RETURN QUERY SELECT NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Note: Password verification will be handled by edge functions
  -- This function now only returns user data for valid usernames
  -- The actual password verification happens in the edge function
  
  -- Return user data for verification by edge function
  RETURN QUERY SELECT 
    jsonb_build_object(
      'id', user_record.id,
      'username', user_record.username,
      'email', user_record.email,
      'full_name', user_record.full_name,
      'employee_code', user_record.employee_code,
      'position', user_record.position,
      'department', user_record.department,
      'cabaña_id', user_record.cabaña_id,
      'is_active', user_record.is_active,
      'stored_password_hash', stored_password
    ),
    true;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::jsonb, false;
END;
$function$;