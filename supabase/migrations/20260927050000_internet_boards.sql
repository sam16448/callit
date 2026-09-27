-- Call It becomes an internet-culture game: new boards, and the old
-- Open Trivia DB / generic sample questions are switched off (kept inactive,
-- because past answers still point at them).
--
-- The live question bank is not in the public repo, so answers can't be
-- looked up; questions are added straight into this table.

create or replace function public.is_board(p_board text) returns boolean
language sql immutable set search_path = public as $$
  select p_board = any (array[
    'mixed', 'memes', 'trends', 'brainrot', 'f1', 'football', 'cricket', 'gaming', 'pop-culture', 'anime', 'tech-ai'
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
    select unnest(array['memes', 'trends', 'brainrot', 'f1', 'football', 'cricket', 'gaming', 'pop-culture', 'anime', 'tech-ai'])
  ), counts as (
    select b.board,
      (select count(*) from questions q where q.board = b.board and q.active and not public.is_practice_question(q.id)) as questions
    from boards b
  )
  select board, questions, questions >= public.run_length(board) from counts
  union all
  -- Mixed takes one question from each of 10 boards.
  select 'mixed', sum(questions)::bigint, count(*) filter (where questions > 0) >= 10 from counts
$$;

-- Where each question's fact came from, for checking and for "report a question".
alter table public.questions add column if not exists source_url text;
alter table public.questions add column if not exists as_of date;

update public.questions set active = false
where source = 'opentdb'
   or board not in ('now', 'memes', 'trends', 'brainrot', 'f1', 'football', 'cricket', 'gaming', 'pop-culture', 'anime', 'tech-ai');
