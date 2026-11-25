-- Apply before the API update. Never run automatically during application startup.
ALTER TABLE nearbook.api_usage ADD COLUMN IF NOT EXISTS acquisition_scope varchar(16);
CREATE INDEX IF NOT EXISTS api_usage_scope_created_idx
  ON nearbook.api_usage(provider, acquisition_scope, created_at);

CREATE TABLE IF NOT EXISTS nearbook.provider_response_cache (
  cache_key varchar(64) PRIMARY KEY,
  payload jsonb,
  fetched_at timestamptz,
  expires_at timestamptz,
  retry_after timestamptz NOT NULL DEFAULT '-infinity',
  lease_token uuid,
  lease_until timestamptz
);

CREATE TABLE IF NOT EXISTS nearbook.book_acquisition_attempts (
  id serial PRIMARY KEY,
  subject_hash varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS book_acquisition_subject_created_idx
  ON nearbook.book_acquisition_attempts(subject_hash, created_at);

ALTER TABLE nearbook.provider_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE nearbook.book_acquisition_attempts ENABLE ROW LEVEL SECURITY;
-- Backend service-role only. No anonymous/browser policies or grants.
