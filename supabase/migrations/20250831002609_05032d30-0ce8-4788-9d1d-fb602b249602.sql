-- Add language columns to support multilingual preferences
-- Add language column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';

-- Add language column to cabañas table  
ALTER TABLE public.cabañas ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';

-- Add check constraints to ensure only supported languages
ALTER TABLE public.profiles ADD CONSTRAINT profiles_language_check 
  CHECK (language IN ('es', 'en', 'pt'));

ALTER TABLE public.cabañas ADD CONSTRAINT cabanas_language_check 
  CHECK (language IN ('es', 'en', 'pt'));

-- Create index for better performance on language queries
CREATE INDEX IF NOT EXISTS idx_profiles_language ON public.profiles(language);
CREATE INDEX IF NOT EXISTS idx_cabanas_language ON public.cabañas(language);