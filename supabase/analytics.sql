-- Smithton Church website analytics: run this once in Supabase → SQL Editor → New query → Run.
-- It's safe to run again (it updates the functions and leaves existing data alone).
--
-- One table of events (page views, clicks, page leaves...) and functions that summarise it for
-- Admin → Analytics. Only the website's server (secret key) can read or write it.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null,              -- 'pageview', 'leave' (time on page + scroll), 'click', 'media', 'search'
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

notify pgrst, 'reload schema'; -- so the website can see the new functions straight away
