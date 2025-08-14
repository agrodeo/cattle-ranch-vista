-- Fix the list_finance_reports function to properly include recurring entries
-- The issue is that we're checking start_date <= month_date (first of month)
-- instead of checking if the recurring entry should be active for that month

CREATE OR REPLACE FUNCTION public.list_finance_reports(
  _user_id uuid,
  _from_date date DEFAULT NULL,
  _to_date date DEFAULT NULL
) RETURNS TABLE(
  date date,
  amount numeric,
  type text,
  category_name text
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  cab_id uuid;
  range_start_date date;
  range_end_date date;
  month_date date;
  month_end_date date;
BEGIN
  -- Get user's cabaña_id
  SELECT cabana_id INTO cab_id FROM public.get_user_cabana_info(_user_id) LIMIT 1;
  IF cab_id IS NULL THEN
    RAISE EXCEPTION 'User not found or no cabaña';
  END IF;

  -- Set default date range if not provided
  range_start_date := COALESCE(_from_date, CURRENT_DATE - interval '6 months');
  range_end_date := COALESCE(_to_date, CURRENT_DATE + interval '6 months');

  -- Return actual finance data within the date range
  RETURN QUERY
  SELECT 
    f.date,
    f.amount,
    f.type,
    COALESCE(fc.name, 'Sin categoría') as category_name
  FROM public.finances f
  LEFT JOIN public.finance_categories fc ON f.category_id = fc.id
  WHERE f.cabaña_id = cab_id
    AND f.date >= range_start_date
    AND f.date <= range_end_date;

  -- Generate recurring finance records projected for each month in the date range
  month_date := date_trunc('month', range_start_date)::date;
  
  WHILE month_date <= range_end_date LOOP
    -- Calculate the end of the current month
    month_end_date := (month_date + interval '1 month' - interval '1 day')::date;
    
    RETURN QUERY
    SELECT 
      month_date as date,
      CASE 
        WHEN fr.frequency = 'monthly' THEN fr.amount
        WHEN fr.frequency = 'yearly' THEN fr.amount / 12.0
        WHEN fr.frequency = 'weekly' THEN fr.amount * 4.33
        WHEN fr.frequency = 'daily' THEN fr.amount * 30.44
        ELSE 0
      END as amount,
      fr.type,
      CONCAT(COALESCE(fc.name, 'Sin categoría'), ' (Recurrente)') as category_name
    FROM public.finance_recurring fr
    LEFT JOIN public.finance_categories fc ON fr.category_id = fc.id
    WHERE fr.cabaña_id = cab_id
      AND fr.is_active = true
      -- Fixed logic: check if the recurring entry overlaps with this month
      AND (fr.start_date <= month_end_date OR fr.start_date IS NULL)
      AND (fr.end_date >= month_date OR fr.end_date IS NULL);
    
    month_date := month_date + interval '1 month';
  END LOOP;
  
  RETURN;
END;
$$;