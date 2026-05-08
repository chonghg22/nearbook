import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = { title: '마이페이지 | 우리동네책' }

export default async function MePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nickname =
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split('@')[0] ??
    '독서가'

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        안녕하세요, <span className="text-primary">{nickname}</span>님 👋
      </h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/me/wishlist"
          className="p-6 rounded-2xl border hover:border-primary-400 transition-colors"
        >
          <div className="text-3xl mb-2">📚</div>
          <p className="font-semibold">내 위시리스트</p>
          <p className="text-sm text-gray-500 mt-1">빌리고 싶은 책 모아두기</p>
        </Link>
        <Link
          href="/me/libraries"
          className="p-6 rounded-2xl border hover:border-primary-400 transition-colors"
        >
          <div className="text-3xl mb-2">🏛</div>
          <p className="font-semibold">내 도서관</p>
          <p className="text-sm text-gray-500 mt-1">자주 가는 도서관 등록</p>
        </Link>
      </div>
    </div>
  )
}
