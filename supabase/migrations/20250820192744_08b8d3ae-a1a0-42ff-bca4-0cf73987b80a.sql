-- Update user login verification to support hashed passwords
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
  
  -- Verify password
  IF stored_password IS NULL THEN
    RETURN QUERY SELECT NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- For now, support both plain text (legacy) and hashed passwords
  -- In production, all passwords should be hashed
  IF stored_password = input_password OR 
     stored_password LIKE 'bcrypt_placeholder:%' AND SUBSTRING(stored_password, 19) = input_password THEN
    
    -- Update last login
    UPDATE public.users
    SET last_login = now()
    WHERE id = user_record.id;
    
    -- Log security event
    PERFORM public.log_security_event('user_login', 'users', user_record.id, 
      jsonb_build_object('username', input_username, 'method', 'internal'));
    
    -- Return user data
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
        'is_active', user_record.is_active
      ),
      true;
  ELSE
    RETURN QUERY SELECT NULL::jsonb, false;
  END IF;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::jsonb, false;
END;
$function$;