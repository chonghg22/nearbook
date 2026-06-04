CREATE TABLE IF NOT EXISTS nearbook.admin_users (
  id serial PRIMARY KEY,
  email varchar(256) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role varchar(32) NOT NULL DEFAULT 'super_admin',
  status varchar(16) NOT NULL DEFAULT 'active',
  totp_enabled boolean NOT NULL DEFAULT false,
  totp_secret_encrypted text,
  pending_totp_secret_encrypted text,
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamp,
  last_login_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_idx ON nearbook.admin_users (email);
CREATE INDEX IF NOT EXISTS admin_users_status_idx ON nearbook.admin_users (status);
