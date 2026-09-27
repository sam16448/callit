-- Supabase security advisor: pin search_path on the small helper functions
-- (the security-definer functions already set it).
alter function public.score_answer(text, boolean, int) set search_path = public;
alter function public.utc_today() set search_path = public;
alter function public.week_of(date) set search_path = public;
alter function public.run_length(text) set search_path = public;
alter function public.is_board(text) set search_path = public;
alter function public.require_user() set search_path = public;
