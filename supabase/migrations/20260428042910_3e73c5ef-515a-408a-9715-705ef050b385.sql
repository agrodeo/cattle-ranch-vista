REVOKE ALL ON FUNCTION public.calculate_animal_score_data(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_herd_scores(uuid, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_animal_score_data(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_herd_scores(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_animal_score_data(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_herd_scores(uuid, uuid[]) TO authenticated;