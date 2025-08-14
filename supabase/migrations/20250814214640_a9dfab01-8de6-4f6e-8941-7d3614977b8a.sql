-- Create system category "Venta de Animales" for all existing cabañas
INSERT INTO public.finance_categories (name, type, cabaña_id, is_system)
SELECT 'Venta de Animales', 'ingreso', c.id, true
FROM public.cabañas c
ON CONFLICT DO NOTHING;

-- Create function to automatically create system categories for new cabañas
CREATE OR REPLACE FUNCTION public.create_default_finance_categories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Create default system categories for new cabaña
  INSERT INTO public.finance_categories (name, type, cabaña_id, is_system) VALUES
  ('Venta de Animales', 'ingreso', NEW.id, true);
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically create system categories for new cabañas
DROP TRIGGER IF EXISTS tr_create_default_finance_categories ON public.cabañas;
CREATE TRIGGER tr_create_default_finance_categories
  AFTER INSERT ON public.cabañas
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_finance_categories();