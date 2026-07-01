'use client'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const params = useSearchParams()
  const next = params.get('next') ?? '/'

  async function handleKakaoLogin() {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        skipBrowserRedirect: true,
        scopes: 'profile_nickname',
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error || !data.url) {
      console.error('OAuth error:', error)
      return
    }

    // Supabase가 붙인 scope를 profile_nickname 으로 덮어쓰기
    const url = new URL(data.url)
    url.searchParams.set('scope', 'profile_nickname')

    window.location.href = url.toString()
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-2">로그인</h1>
      <p className="text-gray-600 mb-8 text-sm">
        즐겨찾기·위시리스트를 사용하려면 로그인하세요.
      </p>
      <button
        onClick={handleKakaoLogin}
        className="w-full py-4 bg-yellow-300 hover:bg-yellow-400 active:bg-yellow-500 rounded-xl font-semibold text-lg transition-colors"
      >
        🟡 카카오로 시작하기
      </button>
      <p className="mt-6 text-xs text-gray-400">
        검색·도서관 보기는 로그인 없이 사용 가능합니다.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
