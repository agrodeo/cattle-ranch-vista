-- Add final weight, scrotal circumference targets and horn preference to custom_benchmarks
ALTER TABLE public.custom_benchmarks 
ADD COLUMN IF NOT EXISTS final_weight_excellent numeric DEFAULT 450,
ADD COLUMN IF NOT EXISTS final_weight_good numeric DEFAULT 420,
ADD COLUMN IF NOT EXISTS final_weight_poor numeric DEFAULT 380,
ADD COLUMN IF NOT EXISTS scrotal_circumference_excellent numeric DEFAULT 38,
ADD COLUMN IF NOT EXISTS scrotal_circumference_good numeric DEFAULT 35,
ADD COLUMN IF NOT EXISTS scrotal_circumference_poor numeric DEFAULT 32,
ADD COLUMN IF NOT EXISTS horn_preference text DEFAULT 'any';

-- Add comment for documentation
COMMENT ON COLUMN public.custom_benchmarks.horn_preference IS 'Preference: polled, horned, or any';