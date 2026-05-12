-- ============================================================
-- 0010_push_subscriptions.sql
-- 목적: 웹 푸시 구독 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS nearbook.push_subscriptions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES nearbook.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh varchar(256) NOT NULL,
  auth varchar(128) NOT NULL,
  user_agent varchar(256),
  created_at timestamp NOT NULL DEFAULT now(),
  last_used_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_sub_user_idx
  ON nearbook.push_subscriptions(user_id);
