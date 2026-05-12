-- ============================================================
-- 0008_notifications.sql
-- 목적: 위시 도착 이메일 알림용 설정/로그/기본 row 트리거 추가
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS nearbook.notification_preferences (
  user_id integer PRIMARY KEY REFERENCES nearbook.users(id) ON DELETE CASCADE,
  email_on_available boolean NOT NULL DEFAULT true,
  unsubscribe_token varchar(64) NOT NULL UNIQUE,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_unsubscribe_token_idx
  ON nearbook.notification_preferences (unsubscribe_token);

CREATE TABLE IF NOT EXISTS nearbook.notification_logs (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES nearbook.users(id) ON DELETE CASCADE,
  type varchar(32) NOT NULL,
  isbn varchar(20) NOT NULL,
  library_id integer NOT NULL REFERENCES nearbook.libraries(id),
  resend_message_id varchar(64),
  status varchar(16) NOT NULL,
  sent_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_user_isbn_lib_idx
  ON nearbook.notification_logs (user_id, isbn, library_id);

CREATE INDEX IF NOT EXISTS notif_sent_at_idx
  ON nearbook.notification_logs (sent_at);

CREATE OR REPLACE FUNCTION nearbook.create_notif_pref()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = nearbook, pg_temp
AS $$
BEGIN
  INSERT INTO nearbook.notification_preferences (user_id, unsubscribe_token)
  VALUES (NEW.id, encode(gen_random_bytes(24), 'hex'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_notif_pref ON nearbook.users;

CREATE TRIGGER trg_create_notif_pref
AFTER INSERT ON nearbook.users
FOR EACH ROW
EXECUTE FUNCTION nearbook.create_notif_pref();

INSERT INTO nearbook.notification_preferences (user_id, unsubscribe_token)
SELECT u.id, encode(gen_random_bytes(24), 'hex')
FROM nearbook.users u
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE nearbook.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_select_own" ON nearbook.notification_preferences;
CREATE POLICY "notification_preferences_select_own"
  ON nearbook.notification_preferences
  FOR SELECT
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = nearbook.notification_preferences.user_id
    )
  );

DROP POLICY IF EXISTS "notification_preferences_update_own" ON nearbook.notification_preferences;
CREATE POLICY "notification_preferences_update_own"
  ON nearbook.notification_preferences
  FOR UPDATE
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = nearbook.notification_preferences.user_id
    )
  )
  WITH CHECK (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = nearbook.notification_preferences.user_id
    )
  );
