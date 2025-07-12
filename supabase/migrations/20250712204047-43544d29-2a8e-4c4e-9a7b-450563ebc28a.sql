-- Add registration level fields to animals table for Braford breed registration system
ALTER TABLE public.animals 
ADD COLUMN registration_level TEXT NULL,
ADD COLUMN registration_level_override TEXT NULL,
ADD COLUMN registration_override_reason TEXT NULL,
ADD COLUMN registration_father_level TEXT NULL,
ADD COLUMN registration_mother_level TEXT NULL,
ADD COLUMN dna_verified BOOLEAN DEFAULT FALSE;

-- Create registration levels enum (for reference)
-- Preparatorio, Controlado, Registrado, Avanzado, Definitivo, Sin Registro, Pendiente de registro

-- Add comment to describe the registration system
COMMENT ON COLUMN public.animals.registration_level IS 'Nivel de registro automático calculado para animales Braford según reglamento ABA 2022';
COMMENT ON COLUMN public.animals.registration_level_override IS 'Nivel de registro manual establecido por el usuario';
COMMENT ON COLUMN public.animals.registration_override_reason IS 'Justificación para el override manual del nivel de registro';
COMMENT ON COLUMN public.animals.registration_father_level IS 'Nivel de registro del padre al momento del cálculo';
COMMENT ON COLUMN public.animals.registration_mother_level IS 'Nivel de registro de la madre al momento del cálculo';
COMMENT ON COLUMN public.animals.dna_verified IS 'Indica si el animal tiene verificación de ADN confirmada';