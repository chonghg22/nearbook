-- P2-02 / schemaVersion=2. Read-only; each numbered block is one query.
-- created_at is timestamp without time zone, interpreted as UTC (the API storage convention).
-- Client ordering is accepted only within 5 minutes of ingestion; otherwise use ingestion.

-- 1. Ingestion and rollout coverage (legacy is deliberately separate).
select type, coalesce(payload->>'schemaVersion', 'legacy') as schema_version,
  count(*) as events, count(distinct session_id) as sessions,
  max((created_at at time zone 'UTC') at time zone 'Asia/Seoul') as latest_seen_kst
from nearbook.events
where created_at >= (now() at time zone 'UTC') - interval '7 days'
group by type, schema_version order by schema_version, type;

-- 2. Ordered session funnel. Every stage must have a preceding matching stage.
-- A later search/book in the same session can convert; no first-book-only bias.
with base as (
  select *, case when payload->>'clientTimeMs' ~ '^[0-9]{13}$' then
    case when abs(extract(epoch from (created_at at time zone 'UTC')) * 1000 -
      (payload->>'clientTimeMs')::numeric) <= 300000
      then to_timestamp((payload->>'clientTimeMs')::double precision / 1000)
      else created_at at time zone 'UTC' end
    else created_at at time zone 'UTC' end as event_at
  from nearbook.events
  where payload->>'schemaVersion' = '2' and nullif(session_id, '') is not null
    and created_at >= (now() at time zone 'UTC') - interval '7 days'
), visits as (
  select distinct on (session_id) session_id, event_at,
    coalesce(nullif(payload->>'trafficSource', ''), 'direct_or_unknown') as traffic_source
  from base where type = 'visit' order by session_id, event_at, id
), searched as (
  select b.* from base b join visits v using (session_id)
  where b.type = 'search_submit' and b.event_at >= v.event_at
    and nullif(b.payload->>'query', '') is not null
    and b.payload->>'invalidIsbn' is distinct from 'true'
), selected as (
  select b.* from base b where b.type = 'book_result_click' and exists (
    select 1 from searched s where s.session_id = b.session_id
      and s.payload->>'query' = b.payload->>'query' and s.event_at <= b.event_at
  )
), viewed as (
  select b.* from base b where b.type = 'book_detail_view' and exists (
    select 1 from selected s where s.session_id = b.session_id
      and s.payload->>'isbn' = b.payload->>'isbn' and s.event_at <= b.event_at
  )
), checked as (
  select b.* from base b where b.type = 'holdings_request_completed'
    and b.payload->>'outcome' in ('complete', 'partial')
    and b.payload->>'checkedCount' ~ '^[1-9][0-9]{0,2}$'
    and exists (select 1 from viewed v where v.session_id = b.session_id
      and v.payload->>'isbn' = b.payload->>'isbn' and v.event_at <= b.event_at)
), acted as (
  select b.* from base b where
    (b.type in ('wishlist_add', 'affiliate_click') or
     (b.type = 'library_click' and b.payload->>'action' in ('library_site', 'directions')))
    and exists (select 1 from checked c where c.session_id = b.session_id
      and c.payload->>'isbn' = b.payload->>'isbn' and c.event_at <= b.event_at
      and (b.type <> 'library_click' or c.payload->>'requestId' = b.payload->>'requestId'))
), flags as (
  select v.*,
    exists (select 1 from searched s where s.session_id = v.session_id) as searched,
    exists (select 1 from selected s where s.session_id = v.session_id) as selected,
    exists (select 1 from viewed s where s.session_id = v.session_id) as viewed,
    exists (select 1 from checked s where s.session_id = v.session_id) as checked,
    exists (select 1 from acted s where s.session_id = v.session_id) as acted
  from visits v
)
select traffic_source, count(*) as visit_sessions,
  count(*) filter (where searched) as search_sessions,
  count(*) filter (where selected) as book_select_sessions,
  count(*) filter (where viewed) as book_view_sessions,
  count(*) filter (where checked) as checked_sessions,
  count(*) filter (where acted) as next_action_sessions,
  round(100.0 * count(*) filter (where checked) /
    nullif(count(*) filter (where viewed), 0), 1) as book_to_check_pct
from flags group by traffic_source order by visit_sessions desc;

-- 3. Completion quality, not screen exposure. Request counts can exceed session counts.
select type, coalesce(payload->>'outcome', payload->>'errorKind') as outcome,
  payload->>'httpStatus' as http_status, count(*) as requests,
  count(distinct session_id) as sessions,
  avg(case when payload->>'durationMs' ~ '^[0-9]{1,9}$'
    then (payload->>'durationMs')::numeric end) as avg_client_duration_ms,
  sum(case when payload->>'heldCount' ~ '^[0-9]{1,3}$'
    then (payload->>'heldCount')::int else 0 end) as held_observations,
  sum(case when payload->>'availableCount' ~ '^[0-9]{1,3}$'
    then (payload->>'availableCount')::int else 0 end) as available_observations,
  count(*) filter (where payload->>'staleCount' ~ '^[1-9][0-9]{0,2}$') as stale_responses
from nearbook.events
where payload->>'schemaVersion' = '2'
  and type in ('holdings_request_completed', 'holdings_request_failed',
    'search_request_completed', 'search_request_failed')
  and created_at >= (now() at time zone 'UTC') - interval '7 days'
group by type, outcome, http_status order by type, outcome;

-- 4. Completed search quality and selection rank. Pending/failure never becomes zero result.
select type, payload->>'searchType' as search_type, payload->>'sort' as sort,
  count(*) as events,
  count(*) filter (where type = 'search_result_view' and payload->>'zeroResult' = 'true') as zero_results,
  avg(case when payload->>'rank' ~ '^[1-9][0-9]{0,6}$'
    then (payload->>'rank')::numeric end) as avg_selected_rank
from nearbook.events
where payload->>'schemaVersion' = '2'
  and type in ('search_result_view', 'book_result_click', 'search_filter_change', 'search_page_change')
  and created_at >= (now() at time zone 'UTC') - interval '7 days'
group by type, search_type, sort order by type;

-- 5. Official-site intent stays distinct from directions and internal navigation.
-- Clicks are not confirmed arrivals, reservations, loans or purchases.
select payload->>'source' as surface, payload->>'action' as action,
  payload->>'libraryId' as library_id, count(*) as clicks,
  count(distinct session_id) as sessions
from nearbook.events
where payload->>'schemaVersion' = '2' and type = 'library_click'
  and created_at >= (now() at time zone 'UTC') - interval '7 days'
group by surface, action, library_id order by clicks desc;

-- 6. Mature browser cohorts, distinct later sessions. No account cross-device matching.
-- "within 7 days" and the D7 [day7,day8) window are DIFFERENT metrics.
with visits as (
  select payload->>'anonymousId' as anonymous_id, session_id,
    min(created_at at time zone 'UTC') as visit_at
  from nearbook.events where type = 'visit' and payload->>'schemaVersion' = '2'
    and nullif(payload->>'anonymousId', '') is not null and nullif(session_id, '') is not null
  group by anonymous_id, session_id
), first_seen as (
  select distinct on (anonymous_id) anonymous_id, session_id as first_session, visit_at as first_at
  from visits order by anonymous_id, visit_at, session_id
), cohorts as (
  select f.*,
    exists (select 1 from visits v where v.anonymous_id = f.anonymous_id
      and v.session_id <> f.first_session and v.visit_at > f.first_at
      and v.visit_at <= f.first_at + interval '7 days') as returned_within_7d,
    exists (select 1 from visits v where v.anonymous_id = f.anonymous_id
      and v.session_id <> f.first_session and v.visit_at >= f.first_at + interval '7 days'
      and v.visit_at < f.first_at + interval '8 days') as returned_d7
  from first_seen f where first_at >= now() - interval '30 days'
)
select count(*) filter (where first_at <= now() - interval '7 days') as eligible_7d,
  count(*) filter (where first_at <= now() - interval '7 days' and returned_within_7d) as returned_within_7d,
  round(100.0 * count(*) filter (where first_at <= now() - interval '7 days' and returned_within_7d) /
    nullif(count(*) filter (where first_at <= now() - interval '7 days'), 0), 1) as within_7d_pct,
  count(*) filter (where first_at <= now() - interval '8 days') as eligible_d7,
  count(*) filter (where first_at <= now() - interval '8 days' and returned_d7) as returned_d7
from cohorts;
