-- Trends splits in two: "Trends Vault" (the existing `trends` board, 2022 to
-- now) and a new "Trending Now" board (`now`) for what's hot this month.
-- Mixed still takes one question from each of 10 random boards.

create or replace function public.is_board(p_board text) returns boolean
language sql immutable set search_path = public as $$
  select p_board = any (array[
    'mixed', 'now', 'memes', 'trends', 'brainrot', 'f1', 'football', 'cricket', 'gaming', 'pop-culture', 'anime', 'tech-ai'
  ])
$$;

create or replace function public.board_status()
returns table (board text, questions bigint, playable boolean)
language sql
stable
security definer
set search_path = public
as $$
  with boards(board) as (
    select unnest(array['now', 'memes', 'trends', 'brainrot', 'f1', 'football', 'cricket', 'gaming', 'pop-culture', 'anime', 'tech-ai'])
  ), counts as (
    select b.board,
      (select count(*) from questions q where q.board = b.board and q.active and not public.is_practice_question(q.id)) as questions
    from boards b
  )
  select board, questions, questions >= public.run_length(board) from counts
  union all
  select 'mixed', sum(questions)::bigint, count(*) filter (where questions > 0) >= 10 from counts
$$;
