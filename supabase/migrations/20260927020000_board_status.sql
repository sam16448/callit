-- Which boards can be played right now (enough active questions for a run).
-- The app uses this to show "Soon" on boards still waiting for questions,
-- so Cricket and Bollywood open automatically once their questions are added.
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
    select b.board, (select count(*) from questions q where q.board = b.board and q.active) as questions
    from boards b
  )
  select board, questions, questions >= public.run_length(board) from counts
  union all
  -- Mixed needs 10 different boards with at least one question each.
  select 'mixed', sum(questions)::bigint, count(*) filter (where questions > 0) >= 10 from counts
$$;

revoke execute on function public.board_status() from public, anon;
grant execute on function public.board_status() to authenticated;

-- Teasers must not stop inside a quote ("Vernon…): cut back to before the open quote.
update public.questions
set teaser = btrim(regexp_replace(teaser, '\s*"[^"]*$', ''))
where (length(teaser) - length(replace(teaser, '"', ''))) % 2 = 1
  and char_length(btrim(regexp_replace(teaser, '\s*"[^"]*$', ''))) > 0;
