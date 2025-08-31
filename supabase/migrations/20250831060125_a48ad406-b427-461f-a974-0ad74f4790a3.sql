-- Complete cleanup of all mock/sample data

-- Delete all weighing events and related data
DELETE FROM public.pesajes;

-- Delete all pregnancy detection (tactos) events  
DELETE FROM public.tactos;

-- Delete all vaccination events
DELETE FROM public.vacunaciones;

-- Delete all artificial insemination events
DELETE FROM public.ia;

-- Delete all pregnancy records
DELETE FROM public.preñeces;

-- Delete all vaccination history records
DELETE FROM public.vacunas_historial;

-- Delete all animal vaccines
DELETE FROM public.animal_vaccines;

-- Delete all animal documents
DELETE FROM public.animal_documents;

-- Delete all corral movements (including auto-generated ones)
DELETE FROM public.corral_movements;

-- Delete all events (this will cascade to related tables)
DELETE FROM public.eventos;

-- Reset animal calculated fields and states
UPDATE public.animals SET
  peso_actual_kg = NULL,
  fecha_ultimo_pesaje = NULL,
  ganancia_diaria_kg = NULL,
  esta_preñada = false,
  fecha_ultima_preñez = NULL,
  fecha_probable_parto = NULL,
  peso_destete = NULL,
  peso_final = NULL,
  fecha_destete = NULL,
  fecha_servicio = NULL,
  toro_servicio_id = NULL,
  peso_nacer = NULL,
  peso_final_mejorado = NULL,
  peso_destete_mejorado = NULL
WHERE TRUE;