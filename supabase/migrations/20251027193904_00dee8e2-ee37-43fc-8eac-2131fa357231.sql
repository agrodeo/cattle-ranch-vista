-- Fix record_vaccination to properly link with vaccination requirements
CREATE OR REPLACE FUNCTION public.record_vaccination(
  _animal_id UUID,
  _vaccine_code TEXT,
  _date DATE,
  _lot TEXT DEFAULT NULL,
  _dose TEXT DEFAULT NULL,
  _route TEXT DEFAULT NULL,
  _created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  animal_record RECORD;
  requirement_record RECORD;
  vaccination_id UUID;
  next_due DATE;
  user_cabana_id UUID;
  dose_num INTEGER := 1;
BEGIN
  -- Get user's cabaña_id from profiles (not users table)
  SELECT cabaña_id INTO user_cabana_id 
  FROM public.profiles 
  WHERE user_id = COALESCE(_created_by, auth.uid());
  
  IF user_cabana_id IS NULL THEN
    RETURN '{"success": false, "error": "User cabaña not found"}'::jsonb;
  END IF;
  
  -- Get animal and verify ownership
  SELECT * INTO animal_record FROM public.animals WHERE id = _animal_id;
  
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Animal not found"}'::jsonb;
  END IF;
  
  IF animal_record.cabaña_id != user_cabana_id THEN
    RETURN '{"success": false, "error": "Animal does not belong to your cabaña"}'::jsonb;
  END IF;
  
  -- Validate date
  IF _date > CURRENT_DATE THEN
    RETURN '{"success": false, "error": "Fecha inválida (futura)"}'::jsonb;
  END IF;
  
  -- Check if animal is active
  IF animal_record.status IN ('muerto', 'vendido') THEN
    RETURN '{"success": false, "error": "Animal no activo"}'::jsonb;
  END IF;
  
  -- Find matching vaccination requirement
  SELECT * INTO requirement_record
  FROM public.cabaña_vaccination_requirements
  WHERE cabaña_id = user_cabana_id
    AND vaccine_name = _vaccine_code
    AND is_active = true
    AND (sex_restriction IS NULL OR sex_restriction = animal_record.sex)
  LIMIT 1;
  
  -- Calculate next due date if requirement has frequency
  IF FOUND AND requirement_record.frequency_months IS NOT NULL THEN
    next_due := _date + (requirement_record.frequency_months || ' months')::INTERVAL;
  END IF;
  
  -- Check for existing doses to determine dose number
  SELECT COALESCE(MAX(dose_number), 0) + 1 INTO dose_num
  FROM public.animal_vaccines
  WHERE animal_id = _animal_id
    AND requirement_id = requirement_record.id;
  
  -- Insert vaccination record
  INSERT INTO public.animal_vaccines (
    animal_id, 
    cabaña_id, 
    vaccine_code, 
    date, 
    lot, 
    dose, 
    route, 
    next_due, 
    created_by,
    requirement_id,
    dose_number,
    is_complete
  ) VALUES (
    _animal_id, 
    user_cabana_id, 
    _vaccine_code, 
    _date, 
    _lot, 
    _dose, 
    _route, 
    next_due, 
    COALESCE(_created_by, auth.uid()),
    requirement_record.id,  -- Link to requirement
    dose_num,
    (dose_num >= COALESCE(requirement_record.doses_required, 1))  -- Mark complete if all doses done
  ) RETURNING id INTO vaccination_id;
  
  -- Return success with vaccination details
  RETURN jsonb_build_object(
    'success', true,
    'vaccination_id', vaccination_id,
    'next_due', next_due,
    'requirement_id', requirement_record.id,
    'dose_number', dose_num,
    'message', 'Vacunación registrada correctamente'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;