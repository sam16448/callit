-- Generational Lock-In.
--
-- Once per run, after seeing the teaser, a player can lock in: they stake
-- their whole week's Aura on that board (the server works out the stake at
-- that moment). The question is played as All-in.
--   Right: normal All-in points + the stake (the week doubles).
--   Wrong or timeout: minus the stake and nothing else (the week goes to 0).
-- Only possible when the week's Aura on that board is above 0.

alter table public.runs add column if not exists lockin_used boolean not null default false;
alter table public.answers add column if not exists lockin boolean not null default false;
alter table public.answers add column if not exists stake int not null default 0;

-- The week's Aura on a board (all runs this week, including the one in progress).
create or replace function public.week_total(p_user uuid, p_board text, p_week date) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(total), 0)::int from runs where user_id = p_user and board = p_board and week = p_week
$$;

create or replace function public.get_teaser(p_board text, p_q_index int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.require_user();
  d date := public.utc_today();
  ids bigint[];
  r runs%rowtype;
  q questions%rowtype;
  a answers%rowtype;
  stake int;
begin
  if not public.is_board(p_board) then raise exception 'unknown board' using errcode = '22023'; end if;
  ids := public.ensure_daily_set(p_board, d);
  if p_q_index < 0 or p_q_index >= cardinality(ids) then raise exception 'no such question' using errcode = '22023'; end if;

  perform public.settle_stale(uid, d, p_board);
  select * into r from runs where user_id = uid and day = d and board = p_board;
  if not found then
    if p_q_index <> 0 then raise exception 'start at question 0' using errcode = 'P0001'; end if;
    insert into runs (user_id, day, board, week, question_count)
    values (uid, d, p_board, public.week_of(d), cardinality(ids))
    returning * into r;
  end if;
  if r.finished then raise exception 'already played today' using errcode = 'P0001'; end if;
  if p_q_index > r.answered then raise exception 'answer the current question first' using errcode = 'P0001'; end if;
  if p_q_index < r.answered then raise exception 'already answered' using errcode = 'P0001'; end if;

  select * into q from questions where id = ids[p_q_index + 1];
  select * into a from answers where user_id = uid and day = d and board = p_board and q_index = p_q_index;
  stake := public.week_total(uid, p_board, r.week);

  return jsonb_build_object(
    'day', d,
    'board', p_board,
    'q_index', p_q_index,
    'question_count', cardinality(ids),
    'category', q.board,
    'teaser', q.teaser,
    'total', r.total,
    'call', a.call,
    'lockin', coalesce(a.lockin, false),
    -- What locking in would stake right now (null when it isn't possible).
    'lockin_stake', case when not r.lockin_used and stake > 0 then stake end
  );
end $$;

drop function if exists public.place_call(text, int, text);
create or replace function public.place_call(p_board text, p_q_index int, p_call text, p_lockin boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.require_user();
  d date := public.utc_today();
  ids bigint[];
  r runs%rowtype;
  q questions%rowtype;
  a answers%rowtype;
  v_stake int := 0;
  v_call text := p_call;
begin
  if p_call not in ('safe', 'sure', 'allin') then raise exception 'unknown call' using errcode = '22023'; end if;
  select question_ids into ids from daily_sets where day = d and board = p_board;
  select * into r from runs where user_id = uid and day = d and board = p_board for update;
  if ids is null or not found then raise exception 'get the teaser first' using errcode = 'P0001'; end if;
  if r.finished or p_q_index <> r.answered then raise exception 'not the current question' using errcode = 'P0001'; end if;

  select * into a from answers where user_id = uid and day = d and board = p_board and q_index = p_q_index;
  if not found then
    if coalesce(p_lockin, false) then
      if r.lockin_used then raise exception 'lock-in already used this run' using errcode = 'P0001'; end if;
      v_stake := public.week_total(uid, p_board, r.week);
      if v_stake <= 0 then raise exception 'nothing to lock in yet' using errcode = 'P0001'; end if;
      v_call := 'allin';
      update runs set lockin_used = true where user_id = uid and day = d and board = p_board;
    end if;
    insert into answers (user_id, day, board, q_index, question_id, call, lockin, stake)
    values (uid, d, p_board, p_q_index, ids[p_q_index + 1], v_call, coalesce(p_lockin, false), v_stake)
    on conflict (user_id, day, board, q_index) do nothing;
    select * into a from answers where user_id = uid and day = d and board = p_board and q_index = p_q_index;
  end if;
  select * into q from questions where id = a.question_id;

  return jsonb_build_object(
    'q_index', p_q_index,
    'call', a.call,
    'lockin', a.lockin,
    'stake', a.stake,
    'prompt', q.prompt,
    'options', to_jsonb(q.options),
    'shown_at', a.shown_at,
    'server_now', now()
  );
end $$;

create or replace function public.record_answer(p_user uuid, p_day date, p_board text, p_q_index int, p_choice int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a answers%rowtype;
  q questions%rowtype;
  r runs%rowtype;
  elapsed_ms int;
  left_ms int;
  is_correct boolean;
  pts int;
  new_streak int;
  p profiles%rowtype;
begin
  select * into a from answers
  where user_id = p_user and day = p_day and board = p_board and q_index = p_q_index
  for update;
  if not found then raise exception 'make your call first' using errcode = 'P0001'; end if;
  if a.answered_at is not null then raise exception 'already answered' using errcode = 'P0001'; end if;

  select * into q from questions where id = a.question_id;
  elapsed_ms := floor(extract(epoch from (now() - a.shown_at)) * 1000)::int;
  if p_choice is null or elapsed_ms > 16500 then
    p_choice := null;
    left_ms := 0;
    is_correct := false;
  else
    left_ms := greatest(0, least(15000, 15000 - elapsed_ms));
    is_correct := p_choice = q.answer_index;
  end if;

  if a.lockin then
    -- Right: All-in points plus the whole stake. Wrong: exactly the stake, so the week lands on 0.
    pts := case when is_correct then public.score_answer('allin', true, left_ms) + a.stake else -a.stake end;
  else
    pts := public.score_answer(a.call, is_correct, left_ms);
  end if;

  update answers set answered_at = now(), choice = p_choice, correct = is_correct, ms_left = left_ms, points = pts
  where user_id = a.user_id and day = a.day and board = a.board and q_index = a.q_index;

  update runs set
    total = total + pts,
    answered = answered + 1,
    correct = correct + (case when is_correct then 1 else 0 end),
    finished = (answered + 1 >= question_count)
  where user_id = p_user and day = p_day and board = p_board
  returning * into r;

  if r.finished then
    select * into p from profiles where id = p_user for update;
    if p.last_played_day is distinct from p_day then
      new_streak := case when p.last_played_day = p_day - 1 then p.day_streak + 1 else 1 end;
      update profiles set day_streak = new_streak, best_streak = greatest(best_streak, new_streak), last_played_day = p_day
      where id = p_user;
    end if;
  end if;

  return jsonb_build_object(
    'q_index', a.q_index,
    'call', a.call,
    'lockin', a.lockin,
    'stake', a.stake,
    'choice', p_choice,
    'correct', is_correct,
    'answer_index', q.answer_index,
    'ms_left', left_ms,
    'points', pts,
    'total', r.total,
    'answered', r.answered,
    'finished', r.finished
  );
end $$;

create or replace function public.run_recap(p_board text, p_day date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.require_user();
  d date := coalesce(p_day, public.utc_today());
begin
  perform public.settle_stale(uid, d, p_board);
  if not exists (select 1 from runs where user_id = uid and day = d and board = p_board and finished) then
    raise exception 'run not finished' using errcode = 'P0001';
  end if;
  return (
    select jsonb_agg(jsonb_build_object(
      'q_index', a.q_index, 'call', a.call, 'lockin', a.lockin, 'stake', a.stake, 'choice', a.choice, 'correct', a.correct,
      'ms_left', a.ms_left, 'points', a.points, 'prompt', q.prompt, 'options', to_jsonb(q.options),
      'answer_index', q.answer_index, 'category', q.board
    ) order by a.q_index)
    from answers a join questions q on q.id = a.question_id
    where a.user_id = uid and a.day = d and a.board = p_board
  );
end $$;

revoke execute on function public.week_total(uuid, text, date) from public, anon, authenticated;
revoke execute on function public.place_call(text, int, text, boolean) from public, anon;
grant execute on function public.place_call(text, int, text, boolean) to authenticated;

insert into public.moments (id, title, sub, emoji, tier) values
  ('lockin_hit', 'GENERATIONAL', 'Locked in the whole week. Cashed out. Aura doubled.', '🔒', 'big'),
  ('lockin_miss', 'FUMBLED THE BAG', 'Locked in the week and missed. Back to zero.', '📉', 'big')
on conflict (id) do nothing;
