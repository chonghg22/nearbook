-- ============================================================
-- 0012_event_applications.sql
-- 목적: 도서관 문화행사 신청 큐 및 폭주 대응 데모
-- ============================================================

CREATE TABLE IF NOT EXISTS nearbook.library_event_programs (
  id serial PRIMARY KEY,
  library_id integer NOT NULL REFERENCES nearbook.libraries(id) ON DELETE CASCADE,
  title varchar(256) NOT NULL,
  summary varchar(512),
  description text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  confirmed_count integer NOT NULL DEFAULT 0 CHECK (confirmed_count >= 0),
  status varchar(16) NOT NULL DEFAULT 'published',
  starts_at timestamp NOT NULL,
  ends_at timestamp NOT NULL,
  application_opens_at timestamp NOT NULL,
  application_closes_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT library_event_programs_status_chk
    CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
  CONSTRAINT library_event_programs_time_chk
    CHECK (starts_at < ends_at AND application_opens_at < application_closes_at)
);

CREATE INDEX IF NOT EXISTS library_event_programs_library_idx
  ON nearbook.library_event_programs(library_id);

CREATE INDEX IF NOT EXISTS library_event_programs_status_application_idx
  ON nearbook.library_event_programs(status, application_opens_at, application_closes_at);

CREATE TABLE IF NOT EXISTS nearbook.event_application_requests (
  id serial PRIMARY KEY,
  program_id integer NOT NULL REFERENCES nearbook.library_event_programs(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES nearbook.users(id) ON DELETE CASCADE,
  idempotency_key varchar(128) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'queued',
  queue_position integer,
  retry_count integer NOT NULL DEFAULT 0,
  processed_at timestamp,
  cancelled_at timestamp,
  last_error text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT event_application_requests_status_chk
    CHECK (status IN ('queued', 'confirmed', 'waitlisted', 'rejected', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS event_applications_program_status_idx
  ON nearbook.event_application_requests(program_id, status, created_at);

CREATE INDEX IF NOT EXISTS event_applications_user_idx
  ON nearbook.event_application_requests(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS event_applications_program_user_idx
  ON nearbook.event_application_requests(program_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS event_applications_idempotency_idx
  ON nearbook.event_application_requests(program_id, idempotency_key);

INSERT INTO nearbook.library_event_programs (
  library_id,
  title,
  summary,
  description,
  capacity,
  starts_at,
  ends_at,
  application_opens_at,
  application_closes_at
)
SELECT
  l.id,
  '폭주에도 안전한 독서 모임 신청 데모',
  '동시 신청이 몰려도 큐로 접수하고 정원 확정을 비동기로 처리하는 포트폴리오용 문화행사입니다.',
  '이 행사는 우리동네책의 이벤트 신청 폭주 대응 설계를 보여주는 데모입니다. 사용자가 신청 버튼을 연속으로 누르거나 많은 신청이 동시에 들어와도 신청은 멱등하게 큐에 접수되고, 별도 worker가 정원만큼 확정합니다.',
  5,
  now() + interval '14 days',
  now() + interval '14 days 2 hours',
  now() - interval '1 day',
  now() + interval '13 days'
FROM nearbook.libraries l
WHERE NOT EXISTS (
  SELECT 1
  FROM nearbook.library_event_programs p
  WHERE p.title = '폭주에도 안전한 독서 모임 신청 데모'
)
ORDER BY l.id
LIMIT 1
ON CONFLICT DO NOTHING;
