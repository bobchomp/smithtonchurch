-- Smithton Church website analytics: run this once in Supabase → SQL Editor → New query → Run.
-- It's safe to run again (it updates the functions and leaves existing data alone).
--
-- One table of events (page views, clicks, page leaves...) and functions that summarise it for
-- Admin → Analytics. Only the website's server (secret key) can read or write it.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null,              -- 'pageview', 'leave' (time on page + scroll), 'click'
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
  target_kind text,                -- 'click': internal, outbound, download, phone, email, button
  target_label text,               -- 'click': the button or link text
  props jsonb
);

create index if not exists analytics_events_created_idx on public.analytics_events (created_at);
create index if not exists analytics_events_type_created_idx on public.analytics_events (type, created_at);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id, created_at);

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
    where type = 'pageview' and created_at >= p_from and created_at < p_to
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

notify pgrst, 'reload schema'; -- so the website can see the new functions straight away
