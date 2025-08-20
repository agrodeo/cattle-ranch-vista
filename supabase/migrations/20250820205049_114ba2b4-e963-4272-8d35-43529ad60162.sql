-- Fix verify_user_login function to actually verify bcrypt passwords
CREATE OR REPLACE FUNCTION public.verify_user_login(input_username text, input_password text)
 RETURNS TABLE(user_data jsonb, success boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  stored_password TEXT;
  is_password_valid BOOLEAN := false;
BEGIN
  -- Try to find user by username
  SELECT u.* INTO user_record
  FROM public.users u
  WHERE u.username = input_username
    AND u.is_internal_profile = true
    AND u.is_active = true;
  
  IF user_record IS NULL THEN
    -- Log failed login attempt
    PERFORM public.log_security_event('login_attempt_invalid_user', 'users', NULL,
      jsonb_build_object('username', input_username, 'method', 'internal'));
    RETURN QUERY SELECT NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Get the stored password
  SELECT password_text INTO stored_password
  FROM public.user_passwords
  WHERE user_id = user_record.id;
  
  -- Verify password exists and is hashed
  IF stored_password IS NULL THEN
    PERFORM public.log_security_event('login_attempt_no_password', 'users', user_record.id,
      jsonb_build_object('username', input_username, 'method', 'internal'));
    RETURN QUERY SELECT NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Only allow bcrypt hashes (starting with $2)
  IF NOT (stored_password LIKE '$2%') THEN
    PERFORM public.log_security_event('login_attempt_unhashed_password', 'users', user_record.id, 
      jsonb_build_object('username', input_username, 'method', 'internal'));
    RETURN QUERY SELECT NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Verify the password using PostgreSQL's crypt function
  -- crypt(password, hash) = hash if password is correct
  SELECT crypt(input_password, stored_password) = stored_password INTO is_password_valid;
  
  IF NOT is_password_valid THEN
    -- Log failed password attempt
    PERFORM public.log_security_event('login_failed_password', 'users', user_record.id,
      jsonb_build_object('username', input_username, 'method', 'internal'));
    RETURN QUERY SELECT NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Update last login timestamp
  UPDATE public.users 
  SET last_login = now() 
  WHERE id = user_record.id;
  
  -- Log successful login
  PERFORM public.log_security_event('login_success', 'users', user_record.id,
    jsonb_build_object('username', input_username, 'method', 'internal'));
  
  -- Return user data without the password hash
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
    
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    PERFORM public.log_security_event('login_error', 'users', user_record.id,
      jsonb_build_object('username', input_username, 'error', SQLERRM, 'method', 'internal'));
    RETURN QUERY SELECT NULL::jsonb, false;
END;
$function$;