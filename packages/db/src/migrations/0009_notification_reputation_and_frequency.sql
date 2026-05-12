-- ============================================================
-- 0009_notification_reputation_and_frequency.sql
-- 목적: Resend 평판 보호 상태 + digest 주기 확장
-- ============================================================

ALTER TABLE nearbook.notification_preferences
  ADD COLUMN IF NOT EXISTS email_status varchar(16) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS soft_bounce_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digest_frequency varchar(16) NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS weekly_digest_dow integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamp,
  ADD COLUMN IF NOT EXISTS last_bounce_at timestamp,
  ADD COLUMN IF NOT EXISTS last_bounce_reason varchar(256);

ALTER TABLE nearbook.notification_logs
  ADD COLUMN IF NOT EXISTS delivery_status varchar(16) DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS delivery_updated_at timestamp;
