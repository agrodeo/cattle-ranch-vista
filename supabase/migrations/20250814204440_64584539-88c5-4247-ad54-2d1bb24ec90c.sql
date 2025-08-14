-- Fix get_finance_summary function to avoid SQL ambiguity
CREATE OR REPLACE FUNCTION public.get_finance_summary(_user_id uuid, _from_date date DEFAULT NULL::date, _to_date date DEFAULT NULL::date)
 RETURNS TABLE(ingresos numeric, egresos numeric, balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  cab_id uuid;
  total_ingresos numeric := 0;
  total_egresos numeric := 0;
  recurring_ingresos numeric := 0;
  recurring_egresos numeric := 0;
  range_start_date date;
  range_end_date date;
  months_in_range integer;
BEGIN
  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  -- Set default date range if not provided
  range_start_date := COALESCE(_from_date, '1900-01-01'::date);
  range_end_date := COALESCE(_to_date, CURRENT_DATE);
  
  -- Calculate months in range for recurring calculations
  months_in_range := EXTRACT(MONTH FROM AGE(range_end_date, range_start_date))::integer + 1;

  -- Calculate actual ingresos (income)
  SELECT COALESCE(SUM(f.amount), 0) INTO total_ingresos
  FROM public.finances f
  WHERE f.cabaña_id = cab_id
    AND f.type = 'ingreso'
    AND f.date >= range_start_date
    AND f.date <= range_end_date;

  -- Calculate actual egresos (expenses)
  SELECT COALESCE(SUM(f.amount), 0) INTO total_egresos
  FROM public.finances f
  WHERE f.cabaña_id = cab_id
    AND f.type = 'egreso'
    AND f.date >= range_start_date
    AND f.date <= range_end_date;

  -- Calculate recurring ingresos (income) for the date range
  SELECT COALESCE(SUM(
    CASE 
      WHEN fr.frequency = 'monthly' THEN fr.amount * months_in_range
      WHEN fr.frequency = 'yearly' THEN fr.amount * (months_in_range / 12.0)
      WHEN fr.frequency = 'weekly' THEN fr.amount * (months_in_range * 4.33)
      WHEN fr.frequency = 'daily' THEN fr.amount * (range_end_date - range_start_date + 1)
      ELSE 0
    END
  ), 0) INTO recurring_ingresos
  FROM public.finance_recurring fr
  WHERE fr.cabaña_id = cab_id
    AND fr.type = 'ingreso'
    AND fr.is_active = true
    AND (fr.start_date <= range_end_date)
    AND (fr.end_date IS NULL OR fr.end_date >= range_start_date);

  -- Calculate recurring egresos (expenses) for the date range
  SELECT COALESCE(SUM(
    CASE 
      WHEN fr.frequency = 'monthly' THEN fr.amount * months_in_range
      WHEN fr.frequency = 'yearly' THEN fr.amount * (months_in_range / 12.0)
      WHEN fr.frequency = 'weekly' THEN fr.amount * (months_in_range * 4.33)
      WHEN fr.frequency = 'daily' THEN fr.amount * (range_end_date - range_start_date + 1)
      ELSE 0
    END
  ), 0) INTO recurring_egresos
  FROM public.finance_recurring fr
  WHERE fr.cabaña_id = cab_id
    AND fr.type = 'egreso'
    AND fr.is_active = true
    AND (fr.start_date <= range_end_date)
    AND (fr.end_date IS NULL OR fr.end_date >= range_start_date);

  -- Return combined totals
  RETURN QUERY SELECT 
    (total_ingresos + recurring_ingresos),
    (total_egresos + recurring_egresos),
    ((total_ingresos + recurring_ingresos) - (total_egresos + recurring_egresos)) as balance;
END;
$function$;

-- Fix list_finance_reports function to avoid SQL ambiguity
CREATE OR REPLACE FUNCTION public.list_finance_reports(_user_id uuid)
 RETURNS TABLE(date date, amount numeric, type text, category_name text)
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

  -- Return actual finance data and projected recurring data
  RETURN QUERY
  -- Actual finance records
  SELECT 
    f.date,
    f.amount,
    f.type,
    fc.name as category_name
  FROM public.finances f
  LEFT JOIN public.finance_categories fc ON f.category_id = fc.id
  WHERE f.cabaña_id = cab_id
  
  UNION ALL
  
  -- Recurring finance records projected for last 12 months
  SELECT 
    generate_series.month::date as date,
    CASE 
      WHEN fr.frequency = 'monthly' THEN fr.amount
      WHEN fr.frequency = 'yearly' THEN fr.amount / 12.0
      WHEN fr.frequency = 'weekly' THEN fr.amount * 4.33
      WHEN fr.frequency = 'daily' THEN fr.amount * 30.44
      ELSE 0
    END as amount,
    fr.type,
    CONCAT(fc.name, ' (Recurrente)') as category_name
  FROM public.finance_recurring fr
  LEFT JOIN public.finance_categories fc ON fr.category_id = fc.id
  CROSS JOIN (
    SELECT date_trunc('month', CURRENT_DATE - interval '12 months' + interval '1 month' * generate_series(0, 11))::date as month
  ) as generate_series
  WHERE fr.cabaña_id = cab_id
    AND fr.is_active = true
    AND (fr.start_date <= generate_series.month OR fr.start_date IS NULL)
    AND (fr.end_date >= generate_series.month OR fr.end_date IS NULL)
  
  ORDER BY date DESC;
END;
$function$;