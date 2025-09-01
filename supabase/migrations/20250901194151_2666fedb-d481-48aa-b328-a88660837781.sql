-- Clean all existing activity data to ensure only user-created activities
DELETE FROM vacunas_historial;
DELETE FROM animal_vaccines; 
DELETE FROM ia;
DELETE FROM tactos;
DELETE FROM preñeces;
DELETE FROM vacunaciones;
DELETE FROM eventos;
DELETE FROM pesajes;
DELETE FROM reproductive_events;
DELETE FROM activities;

-- Reset any animal pregnancy/weight data that might be inconsistent
UPDATE animals SET 
  esta_preñada = false,
  fecha_probable_parto = NULL,
  peso_actual_kg = NULL,
  fecha_ultimo_pesaje = NULL,
  ganancia_diaria_kg = NULL
WHERE true;