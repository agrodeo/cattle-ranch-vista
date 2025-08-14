-- Create secure RPC functions for finance operations

-- Create function to list finance movements
CREATE OR REPLACE FUNCTION public.list_finance_movements(
  _user_id uuid,
  _from_date date DEFAULT NULL,
  _to_date date DEFAULT NULL,
  _type text DEFAULT NULL,
  _search text DEFAULT NULL,
  _category_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  date date,
  type text,
  amount numeric,
  description text,
  category_id uuid,
  category_name text,
  buyer_name text,
  buyer_document text,
  buyer_destination text,
  cabaña_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- Create function to create finance movement
CREATE OR REPLACE FUNCTION public.create_finance_movement(
  _user_id uuid,
  _date date,
  _type text,
  _amount numeric,
  _description text DEFAULT NULL,
  _category_id uuid DEFAULT NULL,
  _buyer_name text DEFAULT NULL,
  _buyer_document text DEFAULT NULL,
  _buyer_destination text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- Create function to update finance movement
CREATE OR REPLACE FUNCTION public.update_finance_movement(
  _user_id uuid,
  _movement_id uuid,
  _date date,
  _type text,
  _amount numeric,
  _description text DEFAULT NULL,
  _category_id uuid DEFAULT NULL,
  _buyer_name text DEFAULT NULL,
  _buyer_document text DEFAULT NULL,
  _buyer_destination text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  cab_id uuid;
  allowed boolean;
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
    RAISE EXCEPTION 'Not authorized to update finance movements';
  END IF;

  -- Update the movement (only if it belongs to the user's cabaña)
  UPDATE public.finances 
  SET 
    date = _date,
    type = _type,
    amount = _amount,
    description = _description,
    category_id = _category_id,
    buyer_name = _buyer_name,
    buyer_document = _buyer_document,
    buyer_destination = _buyer_destination
  WHERE id = _movement_id 
    AND cabaña_id = cab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Finance movement not found or not authorized';
  END IF;
END;
$function$;

-- Create function to delete finance movement
CREATE OR REPLACE FUNCTION public.delete_finance_movement(
  _user_id uuid,
  _movement_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  cab_id uuid;
  allowed boolean;
BEGIN
  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  -- Check permissions
  allowed := public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'employee');
  IF NOT allowed THEN
    RAISE EXCEPTION 'Not authorized to delete finance movements';
  END IF;

  -- Delete the movement (only if it belongs to the user's cabaña)
  DELETE FROM public.finances 
  WHERE id = _movement_id 
    AND cabaña_id = cab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Finance movement not found or not authorized';
  END IF;
END;
$function$;