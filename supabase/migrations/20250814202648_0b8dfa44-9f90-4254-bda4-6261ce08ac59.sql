-- Create RPC function for finance summary that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_finance_summary(_user_id uuid, _from_date date DEFAULT NULL, _to_date date DEFAULT NULL)
RETURNS TABLE(ingresos numeric, egresos numeric, balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  cab_id uuid;
  total_ingresos numeric := 0;
  total_egresos numeric := 0;
BEGIN
  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  -- Calculate ingresos (income)
  SELECT COALESCE(SUM(amount), 0) INTO total_ingresos
  FROM public.finances f
  WHERE f.cabaña_id = cab_id
    AND f.type = 'ingreso'
    AND (_from_date IS NULL OR f.date >= _from_date)
    AND (_to_date IS NULL OR f.date <= _to_date);

  -- Calculate egresos (expenses)
  SELECT COALESCE(SUM(amount), 0) INTO total_egresos
  FROM public.finances f
  WHERE f.cabaña_id = cab_id
    AND f.type = 'egreso'
    AND (_from_date IS NULL OR f.date >= _from_date)
    AND (_to_date IS NULL OR f.date <= _to_date);

  -- Return results
  RETURN QUERY SELECT 
    total_ingresos,
    total_egresos,
    (total_ingresos - total_egresos) as balance;
END;
$function$;