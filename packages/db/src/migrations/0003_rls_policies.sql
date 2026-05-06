-- ============================================================
-- 0003_rls_policies.sql
-- 목적: nearbook 스키마 사용자 데이터 테이블에 RLS 적용
-- 대상: wishlists, library_cards, users (개인 데이터)
-- 비대상: libraries, book_cache, popular_books, search_logs,
--        events, api_usage (공개/시스템 — NestJS service role 만 사용)
-- 적용: Supabase SQL Editor 또는 psql
-- ============================================================

-- ----------------------------------------------------------------
-- nearbook.users : 본인 row 만 조회/수정
-- ----------------------------------------------------------------
ALTER TABLE nearbook.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON nearbook.users;
CREATE POLICY "users_select_own"
  ON nearbook.users
  FOR SELECT
  USING (auth.uid()::text = supabase_user_id);

DROP POLICY IF EXISTS "users_update_own" ON nearbook.users;
CREATE POLICY "users_update_own"
  ON nearbook.users
  FOR UPDATE
  USING (auth.uid()::text = supabase_user_id)
  WITH CHECK (auth.uid()::text = supabase_user_id);

-- INSERT 는 트리거가 SECURITY DEFINER 로 처리하므로 정책 불필요.
-- DELETE 는 차단 (정책 없음 = 거부).

-- ----------------------------------------------------------------
-- nearbook.wishlists : 본인 데이터만 CRUD
-- ----------------------------------------------------------------
ALTER TABLE nearbook.wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlists_select_own" ON nearbook.wishlists;
CREATE POLICY "wishlists_select_own"
  ON nearbook.wishlists
  FOR SELECT
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = nearbook.wishlists.user_id
    )
  );

DROP POLICY IF EXISTS "wishlists_insert_own" ON nearbook.wishlists;
CREATE POLICY "wishlists_insert_own"
  ON nearbook.wishlists
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = user_id
    )
  );

DROP POLICY IF EXISTS "wishlists_update_own" ON nearbook.wishlists;
CREATE POLICY "wishlists_update_own"
  ON nearbook.wishlists
  FOR UPDATE
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = nearbook.wishlists.user_id
    )
  );

DROP POLICY IF EXISTS "wishlists_delete_own" ON nearbook.wishlists;
CREATE POLICY "wishlists_delete_own"
  ON nearbook.wishlists
  FOR DELETE
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = nearbook.wishlists.user_id
    )
  );

-- ----------------------------------------------------------------
-- nearbook.library_cards : 본인 데이터만 CRUD
-- ----------------------------------------------------------------
ALTER TABLE nearbook.library_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library_cards_select_own" ON nearbook.library_cards;
CREATE POLICY "library_cards_select_own"
  ON nearbook.library_cards
  FOR SELECT
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = nearbook.library_cards.user_id
    )
  );

DROP POLICY IF EXISTS "library_cards_insert_own" ON nearbook.library_cards;
CREATE POLICY "library_cards_insert_own"
  ON nearbook.library_cards
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = user_id
    )
  );

DROP POLICY IF EXISTS "library_cards_update_own" ON nearbook.library_cards;
CREATE POLICY "library_cards_update_own"
  ON nearbook.library_cards
  FOR UPDATE
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = nearbook.library_cards.user_id
    )
  );

DROP POLICY IF EXISTS "library_cards_delete_own" ON nearbook.library_cards;
CREATE POLICY "library_cards_delete_own"
  ON nearbook.library_cards
  FOR DELETE
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM nearbook.users WHERE id = nearbook.library_cards.user_id
    )
  );