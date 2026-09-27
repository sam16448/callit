-- Practice mode.
--
-- Fairness: practice questions come from a separate pool (every 5th question,
-- id % 5 = 0) that ranked runs never use, so grinding practice can't teach
-- you tomorrow's ranked answers. Practice is scored on the phone and never
-- counts for any board. Free players get 20 a day (checked on the phone with
-- the RevenueCat entitlement; also on the server once enforce_pro_server is on).

create table if not exists public.practice_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  served int not null default 0,
  primary key (user_id, day)
);
alter table public.practice_log enable row level security;
revoke all on public.practice_log from anon, authenticated;

create or replace function public.is_practice_question(p_id bigint) returns boolean
language sql immutable set search_path = public as $$ select p_id % 5 = 0 $$;

-- Ranked daily sets: same as before, but never from the practice pool.
create or replace function public.ensure_daily_set(p_board text, p_day date)
returns bigint[]
language plpgsql
security definer
set search_path = public
as $$
declare
  ids bigint[];
  n int := public.run_length(p_board);
begin
  select question_ids into ids from daily_sets where day = p_day and board = p_board;
  if ids is not null then return ids; end if;

  if p_board = 'mixed' then
    -- One question from each of 10 random boards, so no topic dominates.
    select array_agg(id) into ids from (
      select id from (
        select distinct on (q.board) q.id, q.board
        from questions q
        where q.active and not public.is_practice_question(q.id)
        order by q.board,
          exists (select 1 from daily_sets d where d.day > p_day - 60 and q.id = any (d.question_ids)),
          random()
      ) per_board
      order by random()
      limit n
    ) picked;
  else
    select array_agg(id) into ids from (
      select q.id from questions q
      where q.active and q.board = p_board and not public.is_practice_question(q.id)
      order by
        exists (select 1 from daily_sets d where d.day > p_day - 60 and q.id = any (d.question_ids)),
        random()
      limit n
    ) picked;
  end if;

  if ids is null or cardinality(ids) < n then
    raise exception 'not enough questions for board %', p_board using errcode = 'P0001';
  end if;

  insert into daily_sets (day, board, question_ids) values (p_day, p_board, ids)
  on conflict (day, board) do nothing;
  select question_ids into ids from daily_sets where day = p_day and board = p_board;
  return ids;
end $$;

-- Board status counts only ranked questions (practice ones can't fill a run).
create or replace function public.board_status()
returns table (board text, questions bigint, playable boolean)
language sql
stable
security definer
set search_path = public
as $$
  with boards(board) as (
    select unnest(array[
      'video-games', 'music', 'general', 'history', 'geography', 'film', 'science',
      'pop-culture', 'tech', 'anime', 'tv', 'books-art', 'sports', 'mind-games', 'cricket', 'bollywood'
    ])
  ), counts as (
    select b.board,
      (select count(*) from questions q where q.board = b.board and q.active and not public.is_practice_question(q.id)) as questions
    from boards b
  )
  select board, questions, questions >= public.run_length(board) from counts
  union all
  select 'mixed', sum(questions)::bigint, count(*) filter (where questions > 0) >= 10 from counts
$$;

-- One random practice question (with its answer: practice is scored on the phone).
create or replace function public.practice_question(p_board text default 'mixed')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.require_user();
  d date := public.utc_today();
  served_before int;
  served_now int;
  enforce boolean;
  q questions%rowtype;
begin
  if not public.is_board(p_board) then raise exception 'unknown board' using errcode = '22023'; end if;
  select coalesce((select served from practice_log where user_id = uid and day = d), 0) into served_before;
  select (value)::text::boolean into enforce from app_settings where key = 'enforce_pro_server';
  if coalesce(enforce, false) and served_before >= 20 and not (select is_pro from profiles where id = uid) then
    raise exception 'practice limit reached' using errcode = 'P0001';
  end if;

  select * into q from questions
  where active and public.is_practice_question(id) and (p_board = 'mixed' or board = p_board)
  order by random()
  limit 1;
  if not found then raise exception 'not enough questions for board %', p_board using errcode = 'P0001'; end if;

  insert into practice_log (user_id, day, served) values (uid, d, 1)
  on conflict (user_id, day) do update set served = practice_log.served + 1
  returning served into served_now;

  return jsonb_build_object(
    'id', q.id,
    'category', q.board,
    'prompt', q.prompt,
    'teaser', q.teaser,
    'options', to_jsonb(q.options),
    'answer_index', q.answer_index,
    'served_today', served_now
  );
end $$;

-- How many practice questions you've had today (for the counter on the Play tab).
create or replace function public.practice_today()
returns int
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select served from practice_log where user_id = auth.uid() and day = public.utc_today()), 0) $$;

revoke execute on function public.is_practice_question(bigint) from public, anon, authenticated;
revoke execute on function public.practice_question(text), public.practice_today() from public, anon;
grant execute on function public.practice_question(text), public.practice_today() to authenticated;
