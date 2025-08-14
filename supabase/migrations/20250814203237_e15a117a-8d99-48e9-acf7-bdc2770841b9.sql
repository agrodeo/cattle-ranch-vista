-- Create RPC function for finance reports that bypasses RLS
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

  -- Return finance data with categories
  RETURN QUERY
  SELECT 
    f.date,
    f.amount,
    f.type,
    fc.name as category_name
  FROM public.finances f
  LEFT JOIN public.finance_categories fc ON f.category_id = fc.id
  WHERE f.cabaña_id = cab_id
  ORDER BY f.date DESC;
END;
$function$;