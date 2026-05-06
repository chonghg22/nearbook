-- ============================================================
-- 0002_auth_trigger.sql
-- 목적: Kakao OAuth 가입 시 auth.users → nearbook.users 자동 sync
-- 적용: Supabase SQL Editor 또는 psql 로 직접 실행 (Drizzle 추적 X)
-- ============================================================

-- 1) 트리거 함수: auth.users INSERT 시 nearbook.users 동기 생성
CREATE OR REPLACE FUNCTION nearbook.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = nearbook, pg_temp
AS $$
BEGIN
  INSERT INTO nearbook.users (supabase_user_id, email, nickname)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'nickname',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (supabase_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2) 트리거 등록 (auth.users 시스템 테이블에)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION nearbook.handle_new_user();