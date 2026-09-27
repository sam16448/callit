-- RevenueCat webhook → server-side Pro.
--
-- RevenueCat posts every subscription event to the revenuecat-webhook Edge
-- Function, which checks the shared Authorization secret and passes the event
-- to apply_revenuecat_event() below. The app logs RevenueCat in with the
-- Supabase player id, so app_user_id is the profile id.
--
-- Pro on the server = is_pro and not past pro_until, so a missed EXPIRATION
-- event can't leave someone Pro forever.

alter table public.profiles add column if not exists pro_until timestamptz;

-- Hashes of shared secrets for incoming webhooks (never the secret itself).
create table if not exists public.webhook_secrets (
  name text primary key,
  sha256 text not null
);
alter table public.webhook_secrets enable row level security;
revoke all on public.webhook_secrets from anon, authenticated;

-- Every event we've applied, for debugging and to ignore RevenueCat's retries.
create table if not exists public.revenuecat_events (
  id text primary key,
  type text not null,
  app_user_id text,
  received_at timestamptz not null default now(),
  profiles_updated int not null default 0
);
alter table public.revenuecat_events enable row level security;
revoke all on public.revenuecat_events from anon, authenticated;

create or replace function public.has_pro(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_pro and (pro_until is null or pro_until > now()) from profiles where id = p_user), false)
$$;

create or replace function public.check_webhook_secret(p_name text, p_secret text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from webhook_secrets
    where name = p_name and sha256 = encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex')
  )
$$;

create or replace function public.uuid_list(p jsonb) returns uuid[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(distinct x::uuid), '{}')
  from jsonb_array_elements_text(coalesce(p, '[]'::jsonb)) as t(x)
  where x ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$$;

-- Applies one RevenueCat event. Returns how many profiles changed.
create or replace function public.apply_revenuecat_event(p_event jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := p_event ->> 'type';
  eid text := coalesce(p_event ->> 'id', md5(p_event::text));
  has_pro_ent boolean := coalesce(p_event -> 'entitlement_ids', '[]'::jsonb) ? 'pro';
  until timestamptz := case when p_event ->> 'expiration_at_ms' ~ '^\d+$' then to_timestamp((p_event ->> 'expiration_at_ms')::bigint / 1000.0) end;
  who uuid[];
  n int := 0;
  m int := 0;
begin
  if exists (select 1 from revenuecat_events where id = eid) then return 0; end if; -- retry of an event we already applied

  who := public.uuid_list(
    jsonb_build_array(p_event ->> 'app_user_id', p_event ->> 'original_app_user_id') || coalesce(p_event -> 'aliases', '[]'::jsonb)
  );

  if t = 'TRANSFER' then
    update profiles set is_pro = false, pro_until = null where id = any (public.uuid_list(p_event -> 'transferred_from'));
    get diagnostics n = row_count;
    who := public.uuid_list(p_event -> 'transferred_to');
  end if;

  if has_pro_ent and t in ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED',
                           'TEMPORARY_ENTITLEMENT_GRANT', 'NON_RENEWING_PURCHASE', 'REFUND_REVERSED', 'TRANSFER') then
    update profiles set is_pro = true, pro_until = until where id = any (who);
    get diagnostics m = row_count;
  elsif has_pro_ent and t = 'EXPIRATION' then
    update profiles set is_pro = false, pro_until = until where id = any (who);
    get diagnostics m = row_count;
  end if;
  -- CANCELLATION and BILLING_ISSUE change nothing: Pro lasts until EXPIRATION.

  insert into revenuecat_events (id, type, app_user_id, profiles_updated)
  values (eid, coalesce(t, '?'), p_event ->> 'app_user_id', n + m);
  return n + m;
end $$;

-- Server checks now use has_pro() (is_pro and not expired).

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
  if coalesce(enforce, false) and not public.has_pro(uid) then
    raise exception 'creating leagues needs Call It Pro' using errcode = '42501';
  end if;
  if (select count(*) from leagues where owner_id = uid) >= 10 then
    raise exception 'league limit reached' using errcode = 'P0001';
  end if;
  loop
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
  if coalesce(enforce, false) and served_before >= 20 and not public.has_pro(uid) then
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
    select rank() over (order by t.total desc) as rank, t.user_id, p.nickname, p.avatar, public.has_pro(p.id) as is_pro, t.total, t.runs, t.user_id = uid as is_me
    from totals t join profiles p on p.id = t.user_id
  )
  select * from ranked
  where ranked.rank <= greatest(1, least(p_limit, 500)) or ranked.is_me
  order by ranked.rank, ranked.nickname;
end $$;

-- Players may ask whether the server sees them as Pro (e.g. to show the badge state).
create or replace function public.my_pro() returns boolean
language sql stable security definer set search_path = public as $$ select public.has_pro(auth.uid()) $$;

revoke execute on function public.has_pro(uuid), public.check_webhook_secret(text, text), public.uuid_list(jsonb), public.apply_revenuecat_event(jsonb)
  from public, anon, authenticated;
revoke execute on function public.my_pro() from public, anon;
grant execute on function public.my_pro() to authenticated;
-- The Edge Function calls these with the service role key.
grant execute on function public.check_webhook_secret(text, text), public.apply_revenuecat_event(jsonb) to service_role;
