-- Helper inlined in each function: owner/manager/admin/employee allowed.

CREATE OR REPLACE FUNCTION public.create_finance_movement(_user_id uuid, _date date, _type text, _amount numeric, _description text DEFAULT NULL::text, _category_id uuid DEFAULT NULL::uuid, _buyer_name text DEFAULT NULL::text, _buyer_document text DEFAULT NULL::text, _buyer_destination text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cab_id uuid; allowed boolean; new_id uuid;
BEGIN
  IF _type IS NULL OR (_type != 'ingreso' AND _type != 'egreso') THEN RAISE EXCEPTION 'Invalid type'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN RAISE EXCEPTION 'User not found or no cabaña'; END IF;
  allowed := public.has_role(_user_id,'owner') OR public.has_role(_user_id,'manager') OR public.has_role(_user_id,'admin') OR public.has_role(_user_id,'employee');
  IF NOT allowed THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.finances (cabaña_id,date,type,amount,description,category_id,buyer_name,buyer_document,buyer_destination)
  VALUES (cab_id,_date,_type,_amount,_description,_category_id,_buyer_name,_buyer_document,_buyer_destination)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_finance_movement(_user_id uuid, _movement_id uuid, _date date, _type text, _amount numeric, _description text DEFAULT NULL::text, _category_id uuid DEFAULT NULL::uuid, _buyer_name text DEFAULT NULL::text, _buyer_document text DEFAULT NULL::text, _buyer_destination text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cab_id uuid; allowed boolean;
BEGIN
  IF _type IS NULL OR (_type != 'ingreso' AND _type != 'egreso') THEN RAISE EXCEPTION 'Invalid type'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN RAISE EXCEPTION 'User not found or no cabaña'; END IF;
  allowed := public.has_role(_user_id,'owner') OR public.has_role(_user_id,'manager') OR public.has_role(_user_id,'admin') OR public.has_role(_user_id,'employee');
  IF NOT allowed THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.finances SET date=_date,type=_type,amount=_amount,description=_description,category_id=_category_id,buyer_name=_buyer_name,buyer_document=_buyer_document,buyer_destination=_buyer_destination
  WHERE id=_movement_id AND cabaña_id=cab_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Finance movement not found or not authorized'; END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.delete_finance_movement(_user_id uuid, _movement_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cab_id uuid; allowed boolean;
BEGIN
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN RAISE EXCEPTION 'User not found or no cabaña'; END IF;
  allowed := public.has_role(_user_id,'owner') OR public.has_role(_user_id,'manager') OR public.has_role(_user_id,'admin') OR public.has_role(_user_id,'employee');
  IF NOT allowed THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.finances WHERE id=_movement_id AND cabaña_id=cab_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Finance movement not found or not authorized'; END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_finance_recurring(_user_id uuid, _name text, _type text, _amount numeric, _frequency text, _category_id uuid DEFAULT NULL::uuid, _description text DEFAULT NULL::text, _start_date date DEFAULT (now())::date, _end_date date DEFAULT NULL::date)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cab_id uuid; allowed boolean; new_id uuid;
BEGIN
  IF COALESCE(TRIM(_name),'')='' OR _type IS NULL OR _frequency IS NULL THEN RAISE EXCEPTION 'Invalid parameters'; END IF;
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN RAISE EXCEPTION 'User not found or no cabaña'; END IF;
  allowed := public.has_role(_user_id,'owner') OR public.has_role(_user_id,'manager') OR public.has_role(_user_id,'admin') OR public.has_role(_user_id,'employee');
  IF NOT allowed THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.finance_recurring("cabaña_id",amount,category_id,start_date,end_date,next_run_date,last_run_date,day_of_month,day_of_week,interval_days,is_active,description,frequency,name,type)
  VALUES (cab_id,COALESCE(_amount,0),_category_id,_start_date,_end_date,_start_date,NULL,NULL,NULL,NULL,true,_description,_frequency,_name,_type)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.delete_finance_recurring(_user_id uuid, _id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cab_id uuid; allowed boolean;
BEGIN
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN RAISE EXCEPTION 'User not found or no cabaña'; END IF;
  allowed := public.has_role(_user_id,'owner') OR public.has_role(_user_id,'manager') OR public.has_role(_user_id,'admin') OR public.has_role(_user_id,'employee');
  IF NOT allowed THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.finance_recurring WHERE id=_id AND "cabaña_id"=cab_id;
END; $function$;