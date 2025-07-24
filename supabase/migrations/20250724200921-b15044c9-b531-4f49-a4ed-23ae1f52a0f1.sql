-- Create function to verify individual user login
CREATE OR REPLACE FUNCTION public.verify_user_login(input_identifier text, input_password text)
RETURNS TABLE(user_data jsonb, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  stored_password TEXT;
BEGIN
  -- Try to find user by email or employee_code
  SELECT u.* INTO user_record
  FROM public.users u
  WHERE (u.email = input_identifier OR u.employee_code = input_identifier)
    AND u.is_active = true
    AND u.is_internal_profile = true;
  
  -- Get password separately
  IF user_record.id IS NOT NULL THEN
    SELECT up.password_text INTO stored_password
    FROM public.user_passwords up
    WHERE up.user_id = user_record.id;
  END IF;
  
  -- If user not found or no password
  IF user_record IS NULL OR stored_password IS NULL THEN
    RETURN QUERY SELECT NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Simple password comparison (in production, use proper hashing)
  IF input_password = stored_password THEN
    -- Update last login
    UPDATE public.users 
    SET last_login = now() 
    WHERE id = user_record.id;
    
    -- Return user data
    RETURN QUERY SELECT 
      jsonb_build_object(
        'id', user_record.id,
        'email', user_record.email,
        'full_name', user_record.full_name,
        'employee_code', user_record.employee_code,
        'position', user_record.position,
        'department', user_record.department,
        'cabaña_id', user_record.cabaña_id,
        'is_active', user_record.is_active
      ),
      true;
  ELSE
    RETURN QUERY SELECT NULL::jsonb, false;
  END IF;
END;
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role_by_id(user_uuid uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = user_uuid
  LIMIT 1;
$$;

-- Create function to get cabaña info
CREATE OR REPLACE FUNCTION public.get_user_cabana_info(user_uuid uuid)
RETURNS TABLE(cabana_id uuid, cabana_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT c.id, c.name
  FROM public.users u
  JOIN public.cabañas c ON u.cabaña_id = c.id
  WHERE u.id = user_uuid
  LIMIT 1;
$$;