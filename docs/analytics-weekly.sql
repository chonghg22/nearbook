-- NearBook weekly analytics queries
-- Run in Supabase SQL Editor. All timestamps are displayed in Asia/Seoul.
-- Default window: last 7 days.

-- 1. Event ingestion smoke check
select
  type,
  count(*) as events,
  count(distinct session_id) as sessions,
  count(distinct payload->>'anonymousId') as anonymous_users,
  max(created_at at time zone 'Asia/Seoul') as latest_seen_kst
from nearbook.events
where created_at >= now() - interval '7 days'
group by type
order by events desc;

-- 2. Source-level funnel
with base as (
  select
    coalesce(nullif(payload->>'trafficSource', ''), 'direct_or_unknown') as traffic_source,
    session_id,
    payload->>'anonymousId' as anonymous_id,
    type
  from nearbook.events
  where created_at >= now() - interval '7 days'
),
session_flags as (
  select
    traffic_source,
    session_id,
    max((type = 'search_submit')::int) as searched,
    max((type in ('book_result_click', 'book_detail_view'))::int) as viewed_book,
    max((type = 'library_status_view')::int) as checked_library,
    max((type = 'library_click')::int) as clicked_library,
    max((type = 'wishlist_add')::int) as added_wishlist,
    max((type = 'affiliate_click')::int) as clicked_affiliate
  from base
  where session_id is not null
  group by traffic_source, session_id
)
select
  traffic_source,
  count(*) as sessions,
  sum(searched) as search_sessions,
  round(100.0 * sum(searched) / nullif(count(*), 0), 1) as search_rate_pct,
  sum(viewed_book) as book_sessions,
  round(100.0 * sum(viewed_book) / nullif(sum(searched), 0), 1) as search_to_book_pct,
  sum(checked_library) as library_check_sessions,
  round(100.0 * sum(checked_library) / nullif(sum(viewed_book), 0), 1) as book_to_library_check_pct,
  sum(clicked_library) as library_click_sessions,
  sum(added_wishlist) as wishlist_sessions,
  sum(clicked_affiliate) as affiliate_sessions
from session_flags
group by traffic_source
order by sessions desc;

-- 3. Daily core metrics
select
  date_trunc('day', created_at at time zone 'Asia/Seoul')::date as day_kst,
  count(*) filter (where type = 'search_submit') as searches,
  count(*) filter (where type = 'search_result_view') as result_views,
  count(*) filter (where type = 'book_detail_view') as book_views,
  count(*) filter (where type = 'library_status_view') as library_status_views,
  count(*) filter (where type = 'library_click') as library_clicks,
  count(*) filter (where type = 'wishlist_add') as wishlist_adds,
  count(*) filter (where type = 'affiliate_click') as affiliate_clicks,
  count(distinct session_id) as sessions
from nearbook.events
where created_at >= now() - interval '14 days'
group by day_kst
order by day_kst desc;

-- 4. Search quality: zero-result and top queries
select
  payload->>'query' as query,
  count(*) as result_views,
  count(*) filter (where (payload->>'zeroResult')::boolean is true) as zero_results,
  round(
    100.0 * count(*) filter (where (payload->>'zeroResult')::boolean is true)
    / nullif(count(*), 0),
    1
  ) as zero_result_rate_pct,
  max(nullif(payload->>'total', '')::int) as max_seen_total
from nearbook.events
where type = 'search_result_view'
  and created_at >= now() - interval '7 days'
  and payload ? 'query'
group by query
order by zero_results desc, result_views desc
limit 50;

-- 5. Book detail and library intent
select
  payload->>'isbn' as isbn,
  max(payload->>'title') as title,
  count(*) filter (where type = 'book_detail_view') as book_views,
  count(*) filter (where type = 'library_status_view') as library_status_views,
  count(*) filter (where type = 'library_click') as library_clicks,
  count(*) filter (where type = 'wishlist_add') as wishlist_adds,
  count(*) filter (where type = 'affiliate_click') as affiliate_clicks
from nearbook.events
where created_at >= now() - interval '7 days'
  and type in (
    'book_detail_view',
    'library_status_view',
    'library_click',
    'wishlist_add',
    'affiliate_click'
  )
  and payload ? 'isbn'
group by isbn
order by book_views desc, library_clicks desc
limit 50;

-- 6. Library clicks
select
  payload->>'libraryId' as library_id,
  max(payload->>'libraryName') as library_name,
  payload->>'action' as action,
  count(*) as clicks,
  count(distinct session_id) as sessions
from nearbook.events
where type = 'library_click'
  and created_at >= now() - interval '7 days'
group by library_id, action
order by clicks desc
limit 50;

-- 7. Affiliate clicks by provider
select
  payload->>'provider' as provider,
  count(*) as clicks,
  count(distinct session_id) as sessions,
  count(distinct payload->>'isbn') as unique_books
from nearbook.events
where type = 'affiliate_click'
  and created_at >= now() - interval '7 days'
group by provider
order by clicks desc;

-- 8. Quick D1/D7 return check by anonymous user
with first_seen as (
  select
    payload->>'anonymousId' as anonymous_id,
    min(created_at) as first_at
  from nearbook.events
  where payload ? 'anonymousId'
  group by anonymous_id
),
returns as (
  select
    f.anonymous_id,
    f.first_at,
    max((e.created_at >= f.first_at + interval '1 day')::int) as returned_d1,
    max((e.created_at >= f.first_at + interval '7 days')::int) as returned_d7
  from first_seen f
  join nearbook.events e
    on e.payload->>'anonymousId' = f.anonymous_id
  group by f.anonymous_id, f.first_at
)
select
  count(*) as anonymous_users,
  sum(returned_d1) as returned_d1_users,
  round(100.0 * sum(returned_d1) / nullif(count(*), 0), 1) as d1_return_pct,
  sum(returned_d7) as returned_d7_users,
  round(100.0 * sum(returned_d7) / nullif(count(*), 0), 1) as d7_return_pct
from returns
where first_at >= now() - interval '30 days';
