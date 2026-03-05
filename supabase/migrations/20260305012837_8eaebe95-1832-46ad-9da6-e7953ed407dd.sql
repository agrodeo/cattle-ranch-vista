CREATE OR REPLACE FUNCTION public.get_mortality_reports(
  _user_id uuid,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  animal_id uuid,
  fecha_defuncion date,
  edad_dias integer,
  edad_meses integer,
  causa_nombre text,
  causa_texto text,
  notas text,
  animal_name text,
  animal_id_tag text,
  animal_sex text,
  animal_breed text,
  cabana_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_cabana_id uuid;
BEGIN
  -- Use profiles table (consistent with get_current_user_cabana_id)
  SELECT p."cabaña_id" INTO user_cabana_id FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1;
  IF user_cabana_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin cabaña asignada';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.animal_id,
    d.fecha_defuncion,
    d.edad_dias,
    d.edad_meses,
    cc.nombre as causa_nombre,
    d.causa_texto,
    d.notas,
    a.name as animal_name,
    a.id_tag as animal_id_tag,
    a.sex as animal_sex,
    a.breed as animal_breed,
    d."cabaña_id" as cabana_id
  FROM public.defunciones d
  LEFT JOIN public.animals a ON d.animal_id = a.id
  LEFT JOIN public.catalogo_causas cc ON d.causa_id = cc.id
  WHERE d."cabaña_id" = user_cabana_id
    AND (_date_from IS NULL OR d.fecha_defuncion >= _date_from)
    AND (_date_to IS NULL OR d.fecha_defuncion <= _date_to)
  ORDER BY d.fecha_defuncion DESC;
END;
$$;