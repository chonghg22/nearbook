-- Read-only preflight. Do not paste credentials or raw account data into reports.
-- No events or settings are changed. TimeZone alone does not prove storage convention.
begin transaction read only;
select current_setting('TimeZone') as session_timezone,
       now() as server_now,
       now() at time zone 'UTC' as utc_wall_time,
       now() at time zone 'Asia/Seoul' as kst_wall_time;
select data_type, column_default
from information_schema.columns
where table_schema='nearbook' and table_name='events' and column_name='created_at';
-- Recent client timestamps are only supporting evidence, not trusted clock truth.
select type, payload->>'schemaVersion' as schema_version,
       payload->>'trafficSource' as traffic_source, created_at,
       case when payload->>'clientTimeMs' ~ '^[0-9]{13}$'
         then round(extract(epoch from ((created_at at time zone 'UTC') -
           to_timestamp((payload->>'clientTimeMs')::double precision / 1000))))
       end as delta_seconds_if_stored_utc
from nearbook.events
where payload->>'schemaVersion'='2'
order by id desc limit 20;
rollback;
