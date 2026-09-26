-- Call It: database schema, security and server-side scoring.
--
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- It is safe to run on a fresh project. Players sign in anonymously; every
-- write goes through the functions at the bottom, which check the caller.
--
-- Scoring must match src/game/scoring.ts exactly (tests/sql.test.ts checks it).


-- ─────────────────────────────────────────────────────────── tables

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  avatar text not null default '🦊',
  is_pro boolean not null default false,
  day_streak int not null default 0,
  best_streak int not null default 0,
  last_played_day date,
  created_at timestamptz not null default now()
);

-- Hidden from players: no select policy, only the functions below read it.
create table if not exists public.questions (
  id bigint generated always as identity primary key,
  board text not null,
  prompt text not null,
  teaser text not null,
  options text[] not null check (cardinality(options) in (2, 4)),
  answer_index smallint not null check (answer_index >= 0 and answer_index < cardinality(options)),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  source text not null default 'callit',
  source_id text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists questions_board_idx on public.questions (board) where active;

-- The day's run for each board: identical for every player.
create table if not exists public.daily_sets (
  day date not null,
  board text not null,
  question_ids bigint[] not null,
  created_at timestamptz not null default now(),
  primary key (day, board)
);

-- One row per player per board per day. The primary key is the one-attempt rule.
create table if not exists public.runs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  board text not null,
  week date not null,
  total int not null default 0,
  answered smallint not null default 0,
  correct smallint not null default 0,
  question_count smallint not null,
  finished boolean not null default false,
  started_at timestamptz not null default now(),
  primary key (user_id, day, board)
);
create index if not exists runs_board_week_idx on public.runs (board, week);

-- One row per question in a run. The primary key is the one-answer rule.
create table if not exists public.answers (
  user_id uuid not null,
  day date not null,
  board text not null,
  q_index smallint not null,
  question_id bigint not null references public.questions (id),
  call text not null check (call in ('safe', 'sure', 'allin')),
  shown_at timestamptz not null default now(),
  answered_at timestamptz,
  choice smallint,
  correct boolean,
  ms_left int,
  points int,
  primary key (user_id, day, board, q_index),
  foreign key (user_id, day, board) references public.runs (user_id, day, board) on delete cascade
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (char_length(name) between 3 and 30),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

-- Captions for moments, so the jokes can change without an app update.
create table if not exists public.moments (
  id text primary key,
  title text not null,
  sub text not null,
  emoji text not null,
  tier text not null check (tier in ('big', 'small')),
  active boolean not null default true
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id bigint not null references public.questions (id),
  reason text not null check (char_length(reason) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);
-- Turn on once the RevenueCat webhook keeps profiles.is_pro up to date.
insert into public.app_settings (key, value) values ('enforce_pro_server', 'false') on conflict do nothing;

-- ─────────────────────────────────────────────────────────── row-level security
-- Everything is locked by default. Players can read only what's listed here;
-- all writes happen inside the security-definer functions below.

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.daily_sets enable row level security;
alter table public.runs enable row level security;
alter table public.answers enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.moments enable row level security;
alter table public.reports enable row level security;
alter table public.app_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select to authenticated using (true);

grant select on public.runs to authenticated;
drop policy if exists "own runs" on public.runs;
create policy "own runs" on public.runs for select to authenticated using (user_id = auth.uid());

grant select on public.moments to anon, authenticated;
drop policy if exists "moments are public" on public.moments;
create policy "moments are public" on public.moments for select to anon, authenticated using (active);

-- ─────────────────────────────────────────────────────────── scoring (mirror of src/game/scoring.ts)

create or replace function public.score_answer(p_call text, p_correct boolean, p_ms_left int)
returns int
language sql
immutable
as $$
  select case
    when not p_correct then case p_call when 'safe' then 0 when 'sure' then -150 else -300 end
    else (100 + floor(50 * least(15000, greatest(0, coalesce(p_ms_left, 0)))::numeric / 15000)::int)
         * case p_call when 'safe' then 1 when 'sure' then 2 else 3 end
  end
$$;

-- ─────────────────────────────────────────────────────────── helpers

create or replace function public.utc_today() returns date
language sql stable as $$ select (now() at time zone 'utc')::date $$;

create or replace function public.week_of(p_day date) returns date
language sql immutable as $$ select date_trunc('week', p_day)::date $$;

create or replace function public.run_length(p_board text) returns int
language sql immutable as $$ select case when p_board = 'mixed' then 10 else 5 end $$;

create or replace function public.is_board(p_board text) returns boolean
language sql immutable as $$
  select p_board = any (array[
    'mixed', 'video-games', 'music', 'general', 'history', 'geography', 'film', 'science',
    'pop-culture', 'tech', 'anime', 'tv', 'books-art', 'sports', 'mind-games', 'cricket', 'bollywood'
  ])
$$;

create or replace function public.require_user() returns uuid
language plpgsql stable as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile missing: call set_profile first' using errcode = 'P0002';
  end if;
  return auth.uid();
end $$;

-- Picks (once) and returns the day's questions for a board. Everyone gets the
-- same list because it is stored. Recently used questions are avoided.
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
        where q.active
          and not exists (select 1 from daily_sets d where d.day > p_day - 60 and q.id = any (d.question_ids))
        order by q.board, random()
      ) per_board
      order by random()
      limit n
    ) picked;
  else
    select array_agg(id) into ids from (
      select q.id from questions q
      where q.active and q.board = p_board
        and not exists (select 1 from daily_sets d where d.day > p_day - 60 and q.id = any (d.question_ids))
      order by random()
      limit n
    ) picked;
  end if;

  if ids is null or cardinality(ids) < n then
    raise exception 'not enough questions for board %', p_board using errcode = 'P0001';
  end if;

  insert into daily_sets (day, board, question_ids) values (p_day, p_board, ids)
  on conflict (day, board) do nothing;
  -- If another player created it at the same moment, use theirs.
  select question_ids into ids from daily_sets where day = p_day and board = p_board;
  return ids;
end $$;

-- A shown question nobody answered (app closed) becomes a timeout.
create or replace function public.settle_stale(p_user uuid, p_day date, p_board text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  for a in
    select * from answers
    where user_id = p_user and day = p_day and board = p_board
      and answered_at is null and shown_at < now() - interval '17 seconds'
    for update
  loop
    perform public.record_answer(a.user_id, a.day, a.board, a.q_index, null);
  end loop;
end $$;

-- Scores one answer and updates the run. Internal: called by submit_answer and settle_stale.
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
  -- 1.5 s grace for network lag: a tap sent at 14.9 s still counts, with no speed bonus left.
  if p_choice is null or elapsed_ms > 16500 then
    p_choice := null;
    left_ms := 0;
    is_correct := false;
  else
    left_ms := greatest(0, least(15000, 15000 - elapsed_ms));
    is_correct := p_choice = q.answer_index;
  end if;
  pts := public.score_answer(a.call, is_correct, left_ms);

  update answers set answered_at = now(), choice = p_choice, correct = is_correct, ms_left = left_ms, points = pts
  where user_id = a.user_id and day = a.day and board = a.board and q_index = a.q_index;

  update runs set
    total = total + pts,
    answered = answered + 1,
    correct = correct + (case when is_correct then 1 else 0 end),
    finished = (answered + 1 >= question_count)
  where user_id = p_user and day = p_day and board = p_board
  returning * into r;

  -- Day streak: counts once per UTC day, on the first finished ranked run.
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

-- ─────────────────────────────────────────────────────────── player API (supabase.rpc)

-- Create or update your nickname and avatar. Same rules as src/lib/nickname.ts.
create or replace function public.set_profile(p_nickname text, p_avatar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  name text := btrim(regexp_replace(coalesce(p_nickname, ''), '\s+', ' ', 'g'));
  v_row profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  -- Unicode-safe: block symbols and control characters rather than listing allowed letters.
  if char_length(name) < 3 or char_length(name) > 16
     or name ~ '[[:cntrl:]<>"''`\\/{}\[\]@#$%^&*+=|~:;,!?()]'
     or name ~ '^[_. -]+$' then
    raise exception 'invalid nickname' using errcode = '22023';
  end if;
  if char_length(coalesce(p_avatar, '')) not between 1 and 16 then
    raise exception 'invalid avatar' using errcode = '22023';
  end if;
  insert into profiles (id, nickname, avatar) values (auth.uid(), name, p_avatar)
  on conflict (id) do update set nickname = excluded.nickname, avatar = excluded.avatar
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

-- Step 1 of each question: the opening words. Starts the run on question 0.
-- You must go in order, and a question already called returns its state again.
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

  return jsonb_build_object(
    'day', d,
    'board', p_board,
    'q_index', p_q_index,
    'question_count', cardinality(ids),
    'category', q.board,
    'teaser', q.teaser,
    'total', r.total,
    -- Reconnecting after the call was made: the call stands.
    'call', a.call
  );
end $$;

-- Step 2: lock in your call. Only now do the options appear and the clock start.
-- Calling again (e.g. after a reconnect) returns the same question and keeps the original start time.
create or replace function public.place_call(p_board text, p_q_index int, p_call text)
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
begin
  if p_call not in ('safe', 'sure', 'allin') then raise exception 'unknown call' using errcode = '22023'; end if;
  select question_ids into ids from daily_sets where day = d and board = p_board;
  select * into r from runs where user_id = uid and day = d and board = p_board;
  if ids is null or not found then raise exception 'get the teaser first' using errcode = 'P0001'; end if;
  if r.finished or p_q_index <> r.answered then raise exception 'not the current question' using errcode = 'P0001'; end if;

  insert into answers (user_id, day, board, q_index, question_id, call)
  values (uid, d, p_board, p_q_index, ids[p_q_index + 1], p_call)
  on conflict (user_id, day, board, q_index) do nothing;
  select * into a from answers where user_id = uid and day = d and board = p_board and q_index = p_q_index;
  select * into q from questions where id = a.question_id;

  return jsonb_build_object(
    'q_index', p_q_index,
    'call', a.call,
    'prompt', q.prompt,
    'options', to_jsonb(q.options),
    'shown_at', a.shown_at,
    'server_now', now()
  );
end $$;

-- Step 3: answer (p_choice = null means the timer ran out). Scored here, never on the phone.
create or replace function public.submit_answer(p_board text, p_q_index int, p_choice int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.require_user();
begin
  return public.record_answer(uid, public.utc_today(), p_board, p_q_index, p_choice);
end $$;

-- Today's run state for every board you've touched (for the Play tab).
create or replace function public.my_today()
returns table (board text, total int, answered smallint, correct smallint, question_count smallint, finished boolean)
language sql
security definer
set search_path = public
as $$
  select r.board, r.total, r.answered, r.correct, r.question_count, r.finished
  from runs r where r.user_id = auth.uid() and r.day = public.utc_today()
$$;

-- A finished run's answers (for the recap). Only after the run ends, so no peeking.
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
      'q_index', a.q_index, 'call', a.call, 'choice', a.choice, 'correct', a.correct,
      'ms_left', a.ms_left, 'points', a.points, 'prompt', q.prompt, 'options', to_jsonb(q.options),
      'answer_index', q.answer_index, 'category', q.board
    ) order by a.q_index)
    from answers a join questions q on q.id = a.question_id
    where a.user_id = uid and a.day = d and a.board = p_board
  );
end $$;

-- Weekly leaderboard for a board, optionally only one league's members.
create or replace function public.weekly_board(p_board text, p_week date default null, p_league_id uuid default null, p_limit int default 100)
returns table (rank bigint, user_id uuid, nickname text, avatar text, is_pro boolean, total bigint, runs bigint, is_me boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  uid uuid := public.require_user();
  wk date := coalesce(p_week, public.week_of(public.utc_today()));
begin
  if p_league_id is not null and not exists (select 1 from league_members m where m.league_id = p_league_id and m.user_id = uid) then
    raise exception 'not in that league' using errcode = '42501';
  end if;
  return query
  with totals as (
    select r.user_id, sum(r.total)::bigint as total, count(*)::bigint as runs
    from runs r
    where r.board = p_board and r.week = wk
      and (p_league_id is null or r.user_id in (select m.user_id from league_members m where m.league_id = p_league_id))
    group by r.user_id
  ), ranked as (
    select rank() over (order by t.total desc) as rank, t.user_id, p.nickname, p.avatar, p.is_pro, t.total, t.runs, t.user_id = uid as is_me
    from totals t join profiles p on p.id = t.user_id
  )
  select * from ranked
  where ranked.rank <= greatest(1, least(p_limit, 500)) or ranked.is_me
  order by ranked.rank, ranked.nickname;
end $$;

-- ─────────────────────────────────────────────────────────── leagues

create or replace function public.create_league(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.require_user();
  new_code text;
  v_row leagues%rowtype;
  enforce boolean;
begin
  select (value)::text::boolean into enforce from app_settings where key = 'enforce_pro_server';
  if coalesce(enforce, false) and not (select is_pro from profiles where id = uid) then
    raise exception 'creating leagues needs Call It Pro' using errcode = '42501';
  end if;
  if (select count(*) from leagues where owner_id = uid) >= 10 then
    raise exception 'league limit reached' using errcode = 'P0001';
  end if;
  loop
    -- 6 characters without look-alikes (no 0/O, 1/I/L).
    new_code := (
      select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from leagues where code = new_code);
  end loop;
  insert into leagues (code, name, owner_id) values (new_code, btrim(p_name), uid) returning * into v_row;
  insert into league_members (league_id, user_id) values (v_row.id, uid);
  return to_jsonb(v_row);
end $$;

create or replace function public.join_league(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.require_user();
  v_row leagues%rowtype;
begin
  select * into v_row from leagues where code = upper(btrim(p_code));
  if not found then raise exception 'no league with that code' using errcode = 'P0002'; end if;
  if (select count(*) from league_members where league_id = v_row.id) >= 200 then
    raise exception 'league is full' using errcode = 'P0001';
  end if;
  insert into league_members (league_id, user_id) values (v_row.id, uid) on conflict do nothing;
  return to_jsonb(v_row);
end $$;

create or replace function public.leave_league(p_league_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from league_members where league_id = p_league_id and user_id = auth.uid()
$$;

create or replace function public.my_leagues()
returns table (id uuid, code text, name text, is_owner boolean, members bigint)
language sql
security definer
set search_path = public
as $$
  select l.id, l.code, l.name, l.owner_id = auth.uid(), (select count(*) from league_members x where x.league_id = l.id)
  from leagues l join league_members m on m.league_id = l.id and m.user_id = auth.uid()
  order by l.created_at
$$;

create or replace function public.report_question(p_board text, p_q_index int, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.require_user();
  qid bigint;
begin
  -- Only questions you've already answered, so reports can't be used to peek.
  select question_id into qid from answers
  where user_id = uid and day = public.utc_today() and board = p_board and q_index = p_q_index and answered_at is not null;
  if qid is null then raise exception 'answer it first' using errcode = 'P0001'; end if;
  insert into reports (user_id, question_id, reason) values (uid, qid, left(btrim(p_reason), 200))
  on conflict (user_id, question_id) do nothing;
end $$;

-- ─────────────────────────────────────────────────────────── permissions
-- Internal helpers are not callable by players; the player API is, when signed in.

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.score_answer(text, boolean, int),
  public.set_profile(text, text),
  public.get_teaser(text, int),
  public.place_call(text, int, text),
  public.submit_answer(text, int, int),
  public.my_today(),
  public.run_recap(text, date),
  public.weekly_board(text, date, uuid, int),
  public.create_league(text),
  public.join_league(text),
  public.leave_league(uuid),
  public.my_leagues(),
  public.report_question(text, int, text)
to authenticated;

-- ─────────────────────────────────────────────────────────── default moment captions

insert into public.moments (id, title, sub, emoji, tier) values
  ('allin_hit', 'AURA +1000', 'All-in and right. Main character.', '💥', 'big'),
  ('allin_miss', '−1000 aura', 'All-in and wrong. Cooked.', '🫠', 'big'),
  ('clutch', 'CLUTCH', 'Under a second to spare.', '⏱️', 'big'),
  ('perfect_run', 'GOAT', 'Perfect run. Every single one.', '🐐', 'big'),
  ('new_number_one', 'NEW #1', 'Top of the board. For now.', '👑', 'big'),
  ('speedrun', 'Speedrun', 'Answered in under 2 seconds.', '⚡', 'small'),
  ('heating_up', 'Locked in', '3 in a row.', '🔥', 'small'),
  ('unstoppable', 'Unstoppable', '5 in a row.', '🚀', 'small'),
  ('six_seven', '6-7', 'Your score ends in 67.', '🤷', 'small'),
  ('streak_milestone', 'Streak', 'Days in a row.', '📅', 'small')
on conflict (id) do nothing;
