-- Update create_company_with_owner function to include email parameter
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  company_name text, 
  owner_name text, 
  owner_username text, 
  owner_password text,
  owner_email text DEFAULT NULL,
  country text DEFAULT 'Argentina',
  region text DEFAULT NULL
)
RETURNS TABLE(user_data jsonb, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
  
  IF owner_username IS NULL OR TRIM(owner_username) = '' THEN
    RETURN QUERY SELECT NULL::jsonb, false, 'Nombre de usuario requerido';
    RETURN;
  END IF;
  
  -- Check if username already exists
  IF EXISTS(SELECT 1 FROM public.users WHERE username = owner_username) THEN
    RETURN QUERY SELECT NULL::jsonb, false, 'El nombre de usuario ya está registrado';
    RETURN;
  END IF;
  
  -- Check if email already exists (if provided)
  IF owner_email IS NOT NULL AND EXISTS(SELECT 1 FROM public.users WHERE email = owner_email) THEN
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
    username,
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
    owner_username,
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
  
  -- Create herd settings with country/region
  INSERT INTO public.herd_settings (cabaña_id, country, region)
  VALUES (new_cabana_id, country, region)
  ON CONFLICT (cabaña_id) DO UPDATE SET
    country = EXCLUDED.country,
    region = EXCLUDED.region;
  
  -- Create default subscription
  INSERT INTO public.subscriptions (cabaña_id, plan, max_animals, max_users)
  VALUES (new_cabana_id, 'free', 50, 2)
  ON CONFLICT (cabaña_id) DO NOTHING;
  
  -- Return success with user data
  RETURN QUERY SELECT 
    jsonb_build_object(
      'id', new_user_id,
      'username', owner_username,
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
$function$;