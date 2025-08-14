-- Create custom_benchmarks table for user-specific benchmarks
CREATE TABLE public.custom_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cabaña_id UUID NOT NULL,
  breed TEXT, -- NULL means default benchmarks for all breeds
  birth_weight_excellent NUMERIC NOT NULL DEFAULT 35,
  birth_weight_good NUMERIC NOT NULL DEFAULT 30,
  birth_weight_poor NUMERIC NOT NULL DEFAULT 28,
  weaning_weight_excellent NUMERIC NOT NULL DEFAULT 200,
  weaning_weight_good NUMERIC NOT NULL DEFAULT 180,
  weaning_weight_poor NUMERIC NOT NULL DEFAULT 160,
  daily_gain_excellent NUMERIC NOT NULL DEFAULT 0.8,
  daily_gain_good NUMERIC NOT NULL DEFAULT 0.7,
  daily_gain_poor NUMERIC NOT NULL DEFAULT 0.6,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cabaña_id, breed) -- Only one benchmark set per breed per cabaña
);

-- Enable RLS
ALTER TABLE public.custom_benchmarks ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_benchmarks
CREATE POLICY "Users can view benchmarks for their cabana" 
ON public.custom_benchmarks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM users u 
  WHERE u.id = auth.uid() AND u."cabaña_id" = custom_benchmarks."cabaña_id"
));

CREATE POLICY "Admins and employees can create benchmarks for their cabana" 
ON public.custom_benchmarks 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 
  FROM users u 
  JOIN user_roles ur ON ur.user_id = u.id 
  WHERE u.id = auth.uid() 
  AND u."cabaña_id" = custom_benchmarks."cabaña_id" 
  AND ur.role = ANY(ARRAY['admin'::app_role, 'employee'::app_role])
));

CREATE POLICY "Admins and employees can update benchmarks for their cabana" 
ON public.custom_benchmarks 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 
  FROM users u 
  JOIN user_roles ur ON ur.user_id = u.id 
  WHERE u.id = auth.uid() 
  AND u."cabaña_id" = custom_benchmarks."cabaña_id" 
  AND ur.role = ANY(ARRAY['admin'::app_role, 'employee'::app_role])
));

CREATE POLICY "Admins and employees can delete benchmarks for their cabana" 
ON public.custom_benchmarks 
FOR DELETE 
USING (EXISTS (
  SELECT 1 
  FROM users u 
  JOIN user_roles ur ON ur.user_id = u.id 
  WHERE u.id = auth.uid() 
  AND u."cabaña_id" = custom_benchmarks."cabaña_id" 
  AND ur.role = ANY(ARRAY['admin'::app_role, 'employee'::app_role])
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_benchmarks_updated_at
BEFORE UPDATE ON public.custom_benchmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();