-- ============================================================
-- 우리동네책 — Supabase 초기 설정 SQL
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================================

-- 1. auth.users → public.users 자동 sync 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (supabase_user_id, email, nickname, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (supabase_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. RLS — wishlists
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own wishlist"
  ON wishlists FOR SELECT
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM users WHERE id = wishlists.user_id
    )
  );

CREATE POLICY "Users insert own wishlist"
  ON wishlists FOR INSERT
  WITH CHECK (
    auth.uid()::text = (
      SELECT supabase_user_id FROM users WHERE id = user_id
    )
  );

CREATE POLICY "Users update own wishlist"
  ON wishlists FOR UPDATE
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM users WHERE id = wishlists.user_id
    )
  );

CREATE POLICY "Users delete own wishlist"
  ON wishlists FOR DELETE
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM users WHERE id = wishlists.user_id
    )
  );

-- 3. RLS — library_cards
ALTER TABLE library_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own library_cards"
  ON library_cards FOR SELECT
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM users WHERE id = library_cards.user_id
    )
  );

CREATE POLICY "Users insert own library_cards"
  ON library_cards FOR INSERT
  WITH CHECK (
    auth.uid()::text = (
      SELECT supabase_user_id FROM users WHERE id = user_id
    )
  );

CREATE POLICY "Users delete own library_cards"
  ON library_cards FOR DELETE
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM users WHERE id = library_cards.user_id
    )
  );

-- 4. RLS — users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = supabase_user_id);

CREATE POLICY "Users update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = supabase_user_id);

-- 5. RLS — notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own notification_preferences"
  ON notification_preferences FOR SELECT
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM users WHERE id = notification_preferences.user_id
    )
  );

CREATE POLICY "Users update own notification_preferences"
  ON notification_preferences FOR UPDATE
  USING (
    auth.uid()::text = (
      SELECT supabase_user_id FROM users WHERE id = notification_preferences.user_id
    )
  );
