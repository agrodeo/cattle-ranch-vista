-- Function to generate unique employee code
CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-digit random code
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM public.users WHERE employee_code = new_code
    ) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to create a new company/cabaña
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  company_name TEXT,
  owner_name TEXT,
  owner_email TEXT,
  owner_password TEXT
)
RETURNS TABLE(user_data jsonb, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_cabana_id UUID;
  new_user_id UUID;
  new_employee_code TEXT;
BEGIN
  -- Validate inputs
  IF company_name IS NULL OR TRIM(company_name) = '' THEN
    RETURN QUERY SELECT NULL::jsonb, false, 'Nombre de empresa requerido';
    RETURN;
  END IF;
  
  IF owner_name IS NULL OR TRIM(owner_name) = '' THEN
    RETURN QUERY SELECT NULL::jsonb, false, 'Nombre del propietario requerido';
    RETURN;
  END IF;
  
  IF owner_email IS NULL OR TRIM(owner_email) = '' THEN
    RETURN QUERY SELECT NULL::jsonb, false, 'Email requerido';
    RETURN;
  END IF;
  
  -- Check if email already exists
  IF EXISTS(SELECT 1 FROM public.users WHERE email = owner_email) THEN
    RETURN QUERY SELECT NULL::jsonb, false, 'El email ya está registrado';
    RETURN;
  END IF;
  
  -- Create the company/cabaña
  INSERT INTO public.cabañas (name)
  VALUES (company_name)
  RETURNING id INTO new_cabana_id;
  
  -- Generate unique employee code
  new_employee_code := public.generate_employee_code();
  
  -- Generate new user ID
  new_user_id := gen_random_uuid();
  
  -- Create the owner user
  INSERT INTO public.users (
    id,
    email,
    full_name,
    employee_code,
    position,
    department,
    cabaña_id,
    is_internal_profile,
    is_active
  ) VALUES (
    new_user_id,
    owner_email,
    owner_name,
    new_employee_code,
    'Propietario',
    'Administración',
    new_cabana_id,
    true,
    true
  );
  
  -- Create password
  INSERT INTO public.user_passwords (user_id, password_text)
  VALUES (new_user_id, owner_password);
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin');
  
  -- Create default subscription
  INSERT INTO public.subscriptions (cabaña_id, plan, max_animals, max_users)
  VALUES (new_cabana_id, 'free', 50, 2)
  ON CONFLICT (cabaña_id) DO NOTHING;
  
  -- Return success with user data
  RETURN QUERY SELECT 
    jsonb_build_object(
      'id', new_user_id,
      'email', owner_email,
      'full_name', owner_name,
      'employee_code', new_employee_code,
      'position', 'Propietario',
      'department', 'Administración',
      'cabaña_id', new_cabana_id,
      'is_active', true
    ),
    true,
    ''::text;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::jsonb, false, 'Error al crear la empresa: ' || SQLERRM;
END;
$$;