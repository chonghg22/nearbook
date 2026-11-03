-- ============================================================
-- 0011_self_auth.sql
-- 목적: Supabase Auth 대신 Nearbook API가 직접 로그인 세션을 발급
--   - auth_identities: 외부 로그인(카카오) 계정 ↔ nearbook.users 연결
--   - auth_sessions:   리프레시 토큰(SHA-256 해시만 저장) 기반 세션
-- users.supabase_user_id 는 기존 데이터 보존을 위해 내부 사용자 식별자(JWT sub)로 계속 사용한다.
-- 적용: psql 로 직접 실행 (Drizzle 추적 X). 재실행해도 안전하다.
-- ============================================================

CREATE TABLE IF NOT EXISTS nearbook.auth_identities (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES nearbook.users(id) ON DELETE CASCADE,
  provider varchar(32) NOT NULL,
  provider_user_id varchar(128) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  last_sign_in_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT auth_identities_provider_user_key UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS auth_identities_user_idx
  ON nearbook.auth_identities(user_id);

CREATE TABLE IF NOT EXISTS nearbook.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer NOT NULL REFERENCES nearbook.users(id) ON DELETE CASCADE,
  refresh_token_hash char(64) NOT NULL UNIQUE,
  provider varchar(32) NOT NULL,
  user_agent varchar(256),
  created_at timestamp NOT NULL DEFAULT now(),
  last_used_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL,
  revoked_at timestamp
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx
  ON nearbook.auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx
  ON nearbook.auth_sessions(expires_at);
