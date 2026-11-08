-- Smithton Church website database: run this in Supabase → SQL Editor → New query → Run.
-- It's safe to run again (it adds anything new and leaves existing data alone).
--
-- Tables for the website's content (sermons, live notices, contact messages, settings), and the
-- analytics: one table of events (page views, clicks...) and functions that summarise it for
-- Admin → Analytics. Only the website's server (secret key) can read or write any of it.

-- ---------- Website content ----------
-- Each row keeps the full record in "data" (as the website's code describes it), with a few
-- columns alongside for sorting and searching.

create table if not exists public.sermons (
  id integer primary key,
  date text not null,                -- YYYY-MM-DD
  service text not null default '', -- 'am', 'pm' or ''
  title text not null default '',
  preacher text not null default '',
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists sermons_date_idx on public.sermons (date desc);

create table if not exists public.live_notices (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id text primary key,               -- also sorts by time received
  received_at timestamptz not null,
  read boolean not null default false,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists contact_messages_received_idx on public.contact_messages (received_at desc);

-- Small settings, one row each: who's emailed about messages, analytics on/off, goals...
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.sermons enable row level security;
alter table public.live_notices enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_settings enable row level security;
revoke all on public.sermons, public.live_notices, public.contact_messages, public.site_settings from anon, authenticated;
grant all on public.sermons, public.live_notices, public.contact_messages, public.site_settings to service_role;

-- ---------- Analytics ----------

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null,              -- 'pageview', 'leave' (time on page + scroll), 'click', 'media', 'search', 'form' (contact form sent)
  visitor_id text,                 -- random ID in the visitor's cookie (returning visitors)
  session_id text,                 -- one visit: ends after 30 minutes without activity
  entry boolean not null default false, -- the first page of a visit
  path text,
  title text,
  referrer text,                   -- the page they came from (other websites only)
  ref_domain text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  region text,
  city text,
  device text,                     -- 'mobile', 'tablet', 'desktop'
  browser text,
  os text,
  screen_w integer,
  duration_ms integer,             -- 'leave': time actively on the page
  scroll_pct smallint,             -- 'leave': how far down the page they got
  target text,                     -- 'click': the link address
  target_kind text,                -- 'click': internal, outbound, download, phone, email, button; 'media': audio, video
  target_label text,               -- 'click': the button or link text; 'media': sermon title; 'search': the words searched for
  props jsonb                      -- extra details: 'media' {pct}, 'search' {results, filters}, missing pages {nf, from}
);

create index if not exists analytics_events_created_idx on public.analytics_events (created_at);
create index if not exists analytics_events_type_created_idx on public.analytics_events (type, created_at);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id, created_at);
create index if not exists analytics_events_visitor_idx on public.analytics_events (visitor_id, created_at);

alter table public.analytics_events enable row level security; -- no public access at all
revoke all on public.analytics_events from anon, authenticated;
grant all on public.analytics_events to service_role;

-- Headline numbers for a period.
create or replace function public.analytics_overview(p_from timestamptz, p_to timestamptz)
returns table (visitors bigint, sessions bigint, pageviews bigint, bounce_rate numeric, avg_visit_seconds numeric)
language sql stable as $$
  with pv as (
    select visitor_id, session_id from public.analytics_events
    where type = 'pageview' and created_at >= p_from and created_at < p_to
  ),
  s as (select session_id, count(*) as n from pv group by session_id),
  t as (
    select session_id, sum(duration_ms) as ms from public.analytics_events
    where type = 'leave' and created_at >= p_from and created_at < p_to
    group by session_id
  )
  select
    (select count(distinct visitor_id) from pv),
    (select count(*) from s),
    (select count(*) from pv),
    (select round(100.0 * avg((n = 1)::int), 1) from s),
    (select round(avg(ms) / 1000.0) from t);
$$;

-- Visitors and page views over time, in UK time. p_unit: 'hour', 'day', 'week' or 'month'.
create or replace function public.analytics_series(p_from timestamptz, p_to timestamptz, p_unit text)
returns table (bucket timestamp, visitors bigint, pageviews bigint)
language sql stable as $$
  select date_trunc(p_unit, created_at at time zone 'Europe/London') as bucket,
         count(distinct visitor_id), count(*)
  from public.analytics_events
  where type = 'pageview' and created_at >= p_from and created_at < p_to
  group by 1 order by 1;
$$;

-- Pages: views, visitors, time on page, scroll depth, and how often visits start or end there.
create or replace function public.analytics_pages(p_from timestamptz, p_to timestamptz, p_limit integer)
returns table (path text, pageviews bigint, visitors bigint, avg_seconds numeric, avg_scroll numeric, entries bigint, exits bigint)
language sql stable as $$
  with pv as (
    select path, visitor_id, session_id, entry, created_at from public.analytics_events
    where type = 'pageview' and created_at >= p_from and created_at < p_to and props->>'nf' is null
  ),
  lv as (
    select path, avg(duration_ms) as ms, avg(scroll_pct) as sc from public.analytics_events
    where type = 'leave' and created_at >= p_from and created_at < p_to
    group by path
  ),
  ex as (
    select path, count(*) as n from (
      select distinct on (session_id) session_id, path from pv order by session_id, created_at desc
    ) last_pages group by path
  )
  select pv.path, count(*), count(distinct pv.visitor_id),
         round(max(lv.ms) / 1000.0), round(max(lv.sc)),
         count(*) filter (where pv.entry), coalesce(max(ex.n), 0)
  from pv
  left join lv on lv.path = pv.path
  left join ex on ex.path = pv.path
  group by pv.path
  order by count(*) desc
  limit p_limit;
$$;

-- Counts by one property. Sources and campaigns count visits (from each visit's first page);
-- everything else counts page views.
create or replace function public.analytics_breakdown(p_from timestamptz, p_to timestamptz, p_dim text, p_limit integer)
returns table (label text, visitors bigint, pageviews bigint)
language sql stable as $$
  select label, count(distinct visitor_id), count(*)
  from (
    select visitor_id,
      case p_dim
        when 'source' then coalesce(nullif(utm_source, ''), ref_domain, '(direct or unknown)')
        when 'campaign' then utm_campaign
        when 'medium' then utm_medium
        when 'referrer' then ref_domain
        when 'entry' then path
        when 'country' then country
        when 'city' then case when city is not null then city || coalesce(', ' || country, '') end
        when 'device' then device
        when 'browser' then browser
        when 'os' then os
        when 'screen' then case
          when screen_w is null then null
          when screen_w < 480 then 'Phone (under 480px)'
          when screen_w < 768 then 'Large phone (480–767px)'
          when screen_w < 1024 then 'Tablet (768–1023px)'
          when screen_w < 1440 then 'Laptop (1024–1439px)'
          else 'Large screen (1440px+)'
        end
      end as label
    from public.analytics_events
    where type = 'pageview' and created_at >= p_from and created_at < p_to
      and (p_dim not in ('source', 'campaign', 'medium', 'referrer', 'entry') or entry)
  ) x
  where label is not null
  group by label
  order by count(*) desc
  limit p_limit;
$$;

-- People on the site in the last five minutes, and the pages they're on.
create or replace function public.analytics_live()
returns table (path text, visitors bigint)
language sql stable as $$
  select path, count(distinct visitor_id)
  from (
    select distinct on (visitor_id) visitor_id, path from public.analytics_events
    where type = 'pageview' and created_at > now() - interval '5 minutes'
    order by visitor_id, created_at desc
  ) latest
  group by path order by 2 desc;
$$;

-- Database space used by the analytics, in bytes, and the number of events.
create or replace function public.analytics_storage()
returns table (bytes bigint, events bigint, since timestamptz)
language sql stable as $$
  select pg_total_relation_size('public.analytics_events'), count(*), min(created_at) from public.analytics_events;
$$;

revoke all on function public.analytics_overview(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.analytics_series(timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.analytics_pages(timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.analytics_breakdown(timestamptz, timestamptz, text, integer) from public, anon, authenticated;
revoke all on function public.analytics_live() from public, anon, authenticated;
revoke all on function public.analytics_storage() from public, anon, authenticated;
grant execute on function public.analytics_overview(timestamptz, timestamptz) to service_role;
grant execute on function public.analytics_series(timestamptz, timestamptz, text) to service_role;
grant execute on function public.analytics_pages(timestamptz, timestamptz, integer) to service_role;
grant execute on function public.analytics_breakdown(timestamptz, timestamptz, text, integer) to service_role;
grant execute on function public.analytics_live() to service_role;
grant execute on function public.analytics_storage() to service_role;

-- ---------- Phase 2 ----------

-- Clicks on links and buttons, by what was clicked. p_kind: null for every kind.
create or replace function public.analytics_clicks(p_from timestamptz, p_to timestamptz, p_kind text, p_limit integer)
returns table (kind text, target text, label text, clicks bigint, visitors bigint, pages bigint)
language sql stable as $$
  select target_kind, max(target), mode() within group (order by target_label),
         count(*), count(distinct visitor_id), count(distinct path)
  from public.analytics_events
  where type = 'click' and created_at >= p_from and created_at < p_to and (p_kind is null or target_kind = p_kind)
    and coalesce(target, target_label) is not null
  group by target_kind, coalesce(target, target_label)
  order by 4 desc
  limit p_limit;
$$;

-- Number of clicks of each kind.
create or replace function public.analytics_click_kinds(p_from timestamptz, p_to timestamptz)
returns table (kind text, clicks bigint, visitors bigint)
language sql stable as $$
  select target_kind, count(*), count(distinct visitor_id) from public.analytics_events
  where type = 'click' and created_at >= p_from and created_at < p_to and target_kind is not null
  group by 1 order by 2 desc;
$$;

-- Sermon plays: one play is a visit pressing play on a sermon's audio or video. Progress is the
-- furthest point reached in that play (0, 25, 50, 75 or 95%, which counts as finished).
create or replace function public.analytics_sermons(p_from timestamptz, p_to timestamptz, p_limit integer)
returns table (path text, title text, plays bigint, audio bigint, video bigint, listeners bigint, avg_progress numeric, finished bigint)
language sql stable as $$
  with plays as (
    select target as path, target_kind as kind, session_id, max(visitor_id) as visitor_id, max(target_label) as title,
           max(coalesce((props->>'pct')::numeric, 0)) as furthest
    from public.analytics_events
    where type = 'media' and created_at >= p_from and created_at < p_to and target is not null
    group by target, target_kind, session_id
  )
  select path, max(title), count(*), count(*) filter (where kind = 'audio'), count(*) filter (where kind = 'video'),
         count(distinct visitor_id), round(avg(furthest)), count(*) filter (where furthest >= 95)
  from plays group by path order by 3 desc, 1
  limit p_limit;
$$;

-- The same, for all sermons together.
create or replace function public.analytics_sermon_totals(p_from timestamptz, p_to timestamptz)
returns table (plays bigint, audio bigint, video bigint, listeners bigint, avg_progress numeric, finished bigint)
language sql stable as $$
  with plays as (
    select target_kind as kind, max(visitor_id) as visitor_id, max(coalesce((props->>'pct')::numeric, 0)) as furthest
    from public.analytics_events
    where type = 'media' and created_at >= p_from and created_at < p_to and target is not null
    group by target, target_kind, session_id
  )
  select count(*), count(*) filter (where kind = 'audio'), count(*) filter (where kind = 'video'),
         count(distinct visitor_id), round(avg(furthest)), count(*) filter (where furthest >= 95)
  from plays;
$$;

-- What people searched for in the sermon archive, and how many sermons it found.
create or replace function public.analytics_searches(p_from timestamptz, p_to timestamptz, p_limit integer)
returns table (term text, searches bigint, visitors bigint, avg_results numeric, no_results bigint)
language sql stable as $$
  select lower(target_label), count(*), count(distinct visitor_id),
         round(avg((props->>'results')::numeric)), count(*) filter (where (props->>'results')::numeric = 0)
  from public.analytics_events
  where type = 'search' and created_at >= p_from and created_at < p_to and target_label is not null
  group by 1 order by 2 desc, 1
  limit p_limit;
$$;

-- The filters chosen in the sermon archive (preacher, book, year, service).
create or replace function public.analytics_search_filters(p_from timestamptz, p_to timestamptz, p_limit integer)
returns table (filter text, value text, uses bigint)
language sql stable as $$
  select f.key, f.value, count(*)
  from public.analytics_events e, jsonb_each_text(coalesce(e.props->'filters', '{}'::jsonb)) f
  where e.type = 'search' and e.created_at >= p_from and e.created_at < p_to
  group by 1, 2 order by 3 desc, 1, 2
  limit p_limit;
$$;

-- Addresses that don't exist, and where people most often came to them from.
create or replace function public.analytics_not_found(p_from timestamptz, p_to timestamptz, p_limit integer)
returns table (path text, views bigint, visitors bigint, last_seen timestamptz, came_from text)
language sql stable as $$
  select path, count(*), count(distinct visitor_id), max(created_at), mode() within group (order by props->>'from')
  from public.analytics_events
  where type = 'pageview' and created_at >= p_from and created_at < p_to and props->>'nf' is not null
  group by path order by 2 desc, 4 desc
  limit p_limit;
$$;

-- For one page: where visitors were just before it, and where they went next.
create or replace function public.analytics_page_flow(p_from timestamptz, p_to timestamptz, p_path text, p_limit integer)
returns table (direction text, label text, visits bigint)
language sql stable as $$
  with pv as (
    select path, coalesce(nullif(utm_source, ''), ref_domain) as src,
           lag(path) over w as prev, lead(path) over w as next
    from public.analytics_events
    where type = 'pageview' and created_at >= p_from and created_at < p_to
    window w as (partition by session_id order by created_at, id)
  ),
  came as (
    select coalesce(prev, case when src is not null then 'Arrived from ' || src else 'Arrived here first (direct or unknown)' end) as label, count(*) as n
    from pv where path = p_path group by 1 order by 2 desc limit p_limit
  ),
  went as (
    select coalesce(next, 'Left the website') as label, count(*) as n
    from pv where path = p_path group by 1 order by 2 desc limit p_limit
  )
  select 'from', label, n from came
  union all
  select 'to', label, n from went;
$$;

-- The most common routes through the website: the first few pages of each visit, in order.
create or replace function public.analytics_journeys(p_from timestamptz, p_to timestamptz, p_steps integer, p_limit integer)
returns table (journey text, visits bigint, visitors bigint)
language sql stable as $$
  with pv as (
    select session_id, visitor_id, path, row_number() over (partition by session_id order by created_at, id) as n
    from public.analytics_events
    where type = 'pageview' and created_at >= p_from and created_at < p_to
  ),
  j as (
    select session_id, max(visitor_id) as visitor_id, count(*) as pages,
           string_agg(path, ' → ' order by n) filter (where n <= p_steps) as journey
    from pv group by session_id
  )
  select journey || case when pages > p_steps then ' → …' else '' end, count(*), count(distinct visitor_id)
  from j group by 1 order by 2 desc, 1
  limit p_limit;
$$;

-- Individual visits, newest first: where they came from, the pages they looked at, and for how long.
create or replace function public.analytics_visits(p_from timestamptz, p_to timestamptz, p_limit integer, p_offset integer)
returns table (started timestamptz, source text, place text, device text, browser text, pages text[], seconds numeric, returning_visitor boolean)
language sql stable as $$
  with s as (
    select session_id, min(created_at) as started, max(visitor_id) as visitor_id,
           array_agg(path order by created_at, id) filter (where type = 'pageview') as pages,
           max(coalesce(nullif(utm_source, ''), ref_domain)) filter (where entry) as source,
           max(case when city is not null then city || coalesce(', ' || country, '') else country end) as place,
           max(device) as device, max(browser) as browser,
           round(sum(duration_ms) filter (where type = 'leave') / 1000.0) as seconds
    from public.analytics_events
    where created_at >= p_from and created_at < p_to
    group by session_id
    having count(*) filter (where type = 'pageview') > 0
  )
  select started, source, place, device, browser, pages, seconds,
         exists (select 1 from public.analytics_events e where e.visitor_id = s.visitor_id and e.created_at < s.started)
  from s order by started desc
  limit p_limit offset p_offset;
$$;

revoke all on function public.analytics_clicks(timestamptz, timestamptz, text, integer) from public, anon, authenticated;
revoke all on function public.analytics_click_kinds(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.analytics_sermons(timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.analytics_sermon_totals(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.analytics_searches(timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.analytics_search_filters(timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.analytics_not_found(timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.analytics_page_flow(timestamptz, timestamptz, text, integer) from public, anon, authenticated;
revoke all on function public.analytics_journeys(timestamptz, timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.analytics_visits(timestamptz, timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.analytics_clicks(timestamptz, timestamptz, text, integer) to service_role;
grant execute on function public.analytics_click_kinds(timestamptz, timestamptz) to service_role;
grant execute on function public.analytics_sermons(timestamptz, timestamptz, integer) to service_role;
grant execute on function public.analytics_sermon_totals(timestamptz, timestamptz) to service_role;
grant execute on function public.analytics_searches(timestamptz, timestamptz, integer) to service_role;
grant execute on function public.analytics_search_filters(timestamptz, timestamptz, integer) to service_role;
grant execute on function public.analytics_not_found(timestamptz, timestamptz, integer) to service_role;
grant execute on function public.analytics_page_flow(timestamptz, timestamptz, text, integer) to service_role;
grant execute on function public.analytics_journeys(timestamptz, timestamptz, integer, integer) to service_role;
grant execute on function public.analytics_visits(timestamptz, timestamptz, integer, integer) to service_role;

-- ---------- Phase 3 ----------

-- Whether an event meets a goal or funnel step. c is {"type": ..., "match": ...}:
--   page (exact address), page-starts (address starts with), click (link address or button text
--   contains), download, outbound (optionally containing match), sermon-play, sermon-finish, search, form.
create or replace function public.analytics_matches(e public.analytics_events, c jsonb)
returns boolean
language sql immutable as $$
  select case c->>'type'
    when 'page' then e.type = 'pageview' and e.props->>'nf' is null and e.path = c->>'match'
    when 'page-starts' then e.type = 'pageview' and e.props->>'nf' is null and starts_with(e.path, coalesce(c->>'match', '/'))
    when 'click' then e.type = 'click' and coalesce(c->>'match', '') <> ''
      and position(lower(c->>'match') in lower(coalesce(e.target, '') || ' ' || coalesce(e.target_label, ''))) > 0
    when 'download' then e.type = 'click' and e.target_kind = 'download'
      and position(lower(coalesce(c->>'match', '')) in lower(coalesce(e.target, '') || ' ' || coalesce(e.target_label, ''))) > 0
    when 'outbound' then e.type = 'click' and e.target_kind = 'outbound'
      and position(lower(coalesce(c->>'match', '')) in lower(coalesce(e.target, '') || ' ' || coalesce(e.target_label, ''))) > 0
    when 'sermon-play' then e.type = 'media'
    when 'sermon-finish' then e.type = 'media' and coalesce((e.props->>'pct')::numeric, 0) >= 95
    when 'search' then e.type = 'search'
    when 'form' then e.type = 'form'
    else false
  end;
$$;

-- A funnel: how many visits did step 1, then step 2 later in the same visit, and so on.
-- p_steps is a JSON array of conditions (see analytics_matches). A goal is a one-step funnel.
create or replace function public.analytics_funnel(p_from timestamptz, p_to timestamptz, p_steps jsonb)
returns table (step integer, visits bigint, visitors bigint)
language sql stable as $$
  with recursive steps as (
    select (ord - 1)::integer as i, cond from jsonb_array_elements(p_steps) with ordinality as t(cond, ord)
  ),
  ev as (
    select * from public.analytics_events where created_at >= p_from and created_at < p_to
  ),
  r as (
    select * from (
      select distinct on (e.session_id) 0 as i, e.session_id, e.visitor_id, e.created_at as at, e.id as eid
      from ev e join steps s on s.i = 0
      where public.analytics_matches(e, s.cond)
      order by e.session_id, e.created_at, e.id
    ) first_step
    union all
    select r.i + 1, r.session_id, r.visitor_id, nx.created_at, nx.id
    from r
    left join lateral (
      select e.created_at, e.id from ev e, steps s
      where s.i = r.i + 1 and e.session_id = r.session_id and (e.created_at, e.id) > (r.at, r.eid)
        and public.analytics_matches(e, s.cond)
      order by e.created_at, e.id
      limit 1
    ) nx on true
    where r.at is not null and r.i + 1 < jsonb_array_length(p_steps)
  )
  select s.i + 1, count(r.at), count(distinct r.visitor_id) filter (where r.at is not null)
  from steps s left join r on r.i = s.i
  group by s.i order by s.i;
$$;

-- For a goal: where the visits that reached it came from, and the page they started on.
create or replace function public.analytics_goal_sources(p_from timestamptz, p_to timestamptz, p_goal jsonb, p_limit integer)
returns table (kind text, label text, visits bigint)
language sql stable as $$
  with hit as (
    select distinct session_id from public.analytics_events e
    where e.created_at >= p_from and e.created_at < p_to and public.analytics_matches(e, p_goal)
  ),
  firsts as (
    select distinct on (e.session_id) e.session_id, e.path, coalesce(nullif(e.utm_source, ''), e.ref_domain, '(direct or unknown)') as src
    from public.analytics_events e join hit using (session_id)
    where e.type = 'pageview' and e.created_at >= p_from and e.created_at < p_to
    order by e.session_id, e.created_at, e.id
  ),
  src as (select 'source' as kind, src as label, count(*) as n from firsts group by 2 order by 3 desc limit p_limit),
  ent as (select 'entry' as kind, path as label, count(*) as n from firsts group by 2 order by 3 desc limit p_limit)
  select kind, label, n from src
  union all
  select kind, label, n from ent;
$$;

-- Clicks on one page for the heatmap: where on the page (the clicked element and the point within
-- it) for screens between p_min_w and p_max_w pixels wide.
create or replace function public.analytics_heatmap(p_from timestamptz, p_to timestamptz, p_path text, p_min_w integer, p_max_w integer, p_limit integer)
returns table (sel text, fx numeric, fy numeric, kind text)
language sql stable as $$
  select props->>'sel', (props->>'fx')::numeric, (props->>'fy')::numeric, target_kind
  from public.analytics_events
  where type = 'click' and created_at >= p_from and created_at < p_to and path = p_path
    and props ? 'sel' and coalesce(screen_w, 0) >= p_min_w and coalesce(screen_w, 0) < p_max_w
  order by created_at desc
  limit p_limit;
$$;

-- How far down one page visitors scrolled: the share of page views that reached each 10%.
create or replace function public.analytics_scroll_reach(p_from timestamptz, p_to timestamptz, p_path text, p_min_w integer, p_max_w integer)
returns table (pct integer, views bigint, total bigint)
language sql stable as $$
  with l as (
    select scroll_pct from public.analytics_events
    where type = 'leave' and created_at >= p_from and created_at < p_to and path = p_path and scroll_pct is not null
      and coalesce(screen_w, 0) >= p_min_w and coalesce(screen_w, 0) < p_max_w
  )
  select g.pct, (select count(*) from l where scroll_pct >= g.pct), (select count(*) from l)
  from generate_series(0, 100, 10) as g(pct);
$$;

-- The flow diagram: page by page through visits. Each step's most visited pages are shown and the
-- rest grouped as "Other pages"; visits that end are "Left the website".
create or replace function public.analytics_flow(p_from timestamptz, p_to timestamptz, p_steps integer, p_nodes integer)
returns table (step integer, source text, target text, visits bigint)
language sql stable as $$
  with pv as (
    select session_id, path, row_number() over (partition by session_id order by created_at, id) as n
    from public.analytics_events
    where type = 'pageview' and created_at >= p_from and created_at < p_to and props->>'nf' is null
  ),
  top as (
    select n, path from (
      select n, path, row_number() over (partition by n order by count(*) desc, path) as r
      from pv where n <= p_steps group by n, path
    ) x where r <= p_nodes
  ),
  lab as (
    select pv.session_id, pv.n, coalesce(top.path, 'Other pages') as label
    from pv left join top on top.n = pv.n and top.path = pv.path
    where pv.n <= p_steps
  )
  select a.n::integer, a.label, coalesce(b.label, 'Left the website'), count(*)
  from lab a left join lab b on b.session_id = a.session_id and b.n = a.n + 1
  where a.n < p_steps
  group by 1, 2, 3
  order by 1, 4 desc;
$$;

revoke all on function public.analytics_matches(public.analytics_events, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_funnel(timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_goal_sources(timestamptz, timestamptz, jsonb, integer) from public, anon, authenticated;
revoke all on function public.analytics_heatmap(timestamptz, timestamptz, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.analytics_scroll_reach(timestamptz, timestamptz, text, integer, integer) from public, anon, authenticated;
revoke all on function public.analytics_flow(timestamptz, timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.analytics_matches(public.analytics_events, jsonb) to service_role;
grant execute on function public.analytics_funnel(timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.analytics_goal_sources(timestamptz, timestamptz, jsonb, integer) to service_role;
grant execute on function public.analytics_heatmap(timestamptz, timestamptz, text, integer, integer, integer) to service_role;
grant execute on function public.analytics_scroll_reach(timestamptz, timestamptz, text, integer, integer) to service_role;
grant execute on function public.analytics_flow(timestamptz, timestamptz, integer, integer) to service_role;

notify pgrst, 'reload schema'; -- so the website can see the new functions straight away
