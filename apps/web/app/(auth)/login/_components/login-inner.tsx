'use client'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

export function LoginInner() {
  const params = useSearchParams()
  const next = params.get('next') || '/'
  const supabase = createClient()

  async function handleKakaoLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-2">로그인</h1>
      <p className="text-gray-500 mb-8 text-sm">
        즐겨찾기·위시리스트를 사용하려면 로그인하세요.
      </p>
      <button
        onClick={handleKakaoLogin}
        className="w-full py-4 bg-yellow-300 hover:bg-yellow-400 rounded-xl font-semibold text-lg transition-colors"
      >
        🟡 카카오로 시작하기
      </button>
      <p className="text-xs text-gray-400 mt-6">
        검색·도서관 보기는 로그인 없이 사용 가능합니다
      </p>
    </div>
  )
}
