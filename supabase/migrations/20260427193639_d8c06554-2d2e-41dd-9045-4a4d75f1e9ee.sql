REVOKE ALL ON FUNCTION public.get_corral_season_comparison(uuid, date, date, text, int, text[], uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_corral_ranking(uuid, date, date, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_corral_season_comparison(uuid, date, date, text, int, text[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_corral_ranking(uuid, date, date, int, text) TO authenticated;