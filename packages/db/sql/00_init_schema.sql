-- Step 02 pre-migration:
-- Supabase SQL Editor에서 가장 먼저 1회 실행.
-- (drizzle-kit push는 nearbook 스키마가 이미 존재해야 작동)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS nearbook;

-- service_role과 authenticated 역할에 nearbook USAGE 권한
GRANT USAGE ON SCHEMA nearbook TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA nearbook TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA nearbook TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA nearbook
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA nearbook
  GRANT ALL ON SEQUENCES TO postgres, service_role;