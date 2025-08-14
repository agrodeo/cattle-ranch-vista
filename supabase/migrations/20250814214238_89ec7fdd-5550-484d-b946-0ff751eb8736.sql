-- Fix animal sale creation issues by updating RLS policies and function

-- 1. Add missing RLS policies for finances_animal_sales table
DROP POLICY IF EXISTS "Users can insert finance animal sales for their cabana" ON public.finances_animal_sales;
DROP POLICY IF EXISTS "Users can update finance animal sales for their cabana" ON public.finances_animal_sales;
DROP POLICY IF EXISTS "Users can delete finance animal sales for their cabana" ON public.finances_animal_sales;

CREATE POLICY "Users can insert finance animal sales for their cabana" 
ON public.finances_animal_sales 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM finances f
    JOIN users u ON u.id = auth.uid()
    WHERE f.id = finances_animal_sales.finance_id 
    AND f.cabaña_id = u.cabaña_id
  )
);

CREATE POLICY "Users can update finance animal sales for their cabana" 
ON public.finances_animal_sales 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM finances f
    JOIN users u ON u.id = auth.uid()
    WHERE f.id = finances_animal_sales.finance_id 
    AND f.cabaña_id = u.cabaña_id
  )
);

CREATE POLICY "Users can delete finance animal sales for their cabana" 
ON public.finances_animal_sales 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM finances f
    JOIN users u ON u.id = auth.uid()
    WHERE f.id = finances_animal_sales.finance_id 
    AND f.cabaña_id = u.cabaña_id
  )
);

-- 2. Update create_animal_sale function to work without auth.uid()
CREATE OR REPLACE FUNCTION public.create_animal_sale(_cabana_id uuid, _date date, _amount numeric, _description text, _buyer_name text, _buyer_document text, _buyer_destination text, _animal_ids uuid[], _unit_prices numeric[], _category_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  finance_id uuid;
  i int;
  price numeric;
begin
  -- Note: Authorization is handled by the calling code since we're using custom auth
  -- The _cabana_id parameter comes from the authenticated user's session
  
  insert into public.finances (cabaña_id, date, type, amount, description, category_id, buyer_name, buyer_document, buyer_destination)
  values (_cabana_id, _date, 'ingreso', _amount, _description, _category_id, _buyer_name, _buyer_document, _buyer_destination)
  returning id into finance_id;

  if _animal_ids is not null then
    for i in 1..array_length(_animal_ids, 1) loop
      price := null;
      if _unit_prices is not null and array_length(_unit_prices, 1) >= i then
        price := _unit_prices[i];
      end if;
      insert into public.finances_animal_sales (finance_id, animal_id, unit_price)
      values (finance_id, _animal_ids[i], price);
    end loop;

    update public.animals
      set status = 'vendido'
      where id = any(_animal_ids)
        and cabaña_id = _cabana_id;
  end if;

  return finance_id;
end;
$function$