CREATE OR REPLACE FUNCTION public.create_finance_category(_user_id uuid, _name text, _type text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cab_id uuid;
  new_id uuid;
  allowed boolean;
BEGIN
  IF COALESCE(TRIM(_name),'') = '' OR _type IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters';
  END IF;

  SELECT cabana_id INTO cab_id FROM get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  allowed := has_role(_user_id, 'owner')
          OR has_role(_user_id, 'manager')
          OR has_role(_user_id, 'admin')
          OR has_role(_user_id, 'employee');
  IF NOT allowed THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO finance_categories(name, type, "cabaña_id", is_system)
  VALUES (_name, _type, cab_id, false)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;