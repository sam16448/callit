-- my_today settles questions that timed out while the player was away, so a
-- resumed run starts at the right question (not one that already expired).

create or replace function public.my_today()
returns table (board text, total int, answered smallint, correct smallint, question_count smallint, finished boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  b text;
begin
  if uid is not null then
    for b in select r.board from runs r where r.user_id = uid and r.day = public.utc_today() and not r.finished loop
      perform public.settle_stale(uid, public.utc_today(), b);
    end loop;
  end if;
  return query
    select r.board, r.total, r.answered, r.correct, r.question_count, r.finished
    from runs r where r.user_id = uid and r.day = public.utc_today();
end $$;
