-- RPCs to work with custom auth by passing user_id explicitly and validating roles/cabaña

-- 1) Create finance category
CREATE OR REPLACE FUNCTION public.create_finance_category(
  _user_id uuid,
  _name text,
  _type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  cab_id uuid;
  new_id uuid;
  allowed boolean;
BEGIN
  IF COALESCE(TRIM(_name),'') = '' OR _type IS NULL THEN
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

  INSERT INTO public.finance_categories(name, type, "cabaña_id", is_system)
  VALUES (_name, _type, cab_id, false)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 2) List finance categories (system + own cabana)
CREATE OR REPLACE FUNCTION public.list_finance_categories(
  _user_id uuid,
  _type text
)
RETURNS TABLE(id uuid, name text, type text, "cabaña_id" uuid, is_system boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH user_cab AS (
    SELECT cabana_id FROM public.get_user_cabana_info(_user_id) LIMIT 1
  )
  SELECT fc.id, fc.name, fc.type, fc."cabaña_id", fc.is_system
  FROM public.finance_categories fc, user_cab
  WHERE fc.type = _type
    AND (fc."cabaña_id" IS NULL OR fc."cabaña_id" = user_cab.cabana_id)
  ORDER BY fc.is_system DESC, fc.name ASC;
$$;

-- 3) List finance recurring for user's cabana
CREATE OR REPLACE FUNCTION public.list_finance_recurring(
  _user_id uuid
)
RETURNS TABLE(
  id uuid,
  "cabaña_id" uuid,
  amount numeric,
  category_id uuid,
  start_date date,
  end_date date,
  next_run_date date,
  last_run_date date,
  day_of_month integer,
  day_of_week integer,
  interval_days integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  description text,
  frequency text,
  name text,
  type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

-- 4) Create finance recurring (place non-default params before defaults)
CREATE OR REPLACE FUNCTION public.create_finance_recurring(
  _user_id uuid,
  _name text,
  _type text,
  _amount numeric,
  _frequency text,
  _category_id uuid DEFAULT NULL,
  _description text DEFAULT NULL,
  _start_date date DEFAULT now()::date,
  _end_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

-- 5) Delete finance recurring (scoped to user's cabana)
CREATE OR REPLACE FUNCTION public.delete_finance_recurring(
  _user_id uuid,
  _id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;