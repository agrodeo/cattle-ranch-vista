-- Fix list_finance_reports to include current and future months for recurring entries
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
  
  -- Recurring finance records projected for past 6 months + current + next 6 months (13 months total)
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
    SELECT date_trunc('month', CURRENT_DATE - interval '6 months' + interval '1 month' * generate_series(0, 12))::date as month
  ) as generate_series
  WHERE fr.cabaña_id = cab_id
    AND fr.is_active = true
    AND (fr.start_date <= generate_series.month OR fr.start_date IS NULL)
    AND (fr.end_date >= generate_series.month OR fr.end_date IS NULL)
  
  ORDER BY date DESC;
END;
$function$