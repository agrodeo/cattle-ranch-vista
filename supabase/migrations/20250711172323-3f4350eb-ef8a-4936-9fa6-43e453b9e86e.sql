-- Fix foreign key reference for corrales
ALTER TABLE public.corrales 
DROP COLUMN cabana_id;

ALTER TABLE public.corrales 
ADD COLUMN cabaña_id UUID REFERENCES public.cabañas(id);