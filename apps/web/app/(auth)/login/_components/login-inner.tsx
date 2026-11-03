'use client'
import { useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'
import { safeReturnPath } from '@/lib/auth-return-path'

export function LoginInner() {
  const params = useSearchParams()
  const next = safeReturnPath(params.get('next'))
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    params.get('error') === 'auth' ? '로그인이 완료되지 않았습니다. 다시 시도해 주세요.' : null
  )
  const busy = useRef(false)

  function handleKakaoLogin() {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setErrorMessage(null)
    // The server route binds a one-time state to this browser and redirects to Kakao (profile_nickname only).
    window.location.href = `/auth/kakao?next=${encodeURIComponent(next)}`
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-2">로그인</h1>
      <p className="text-gray-500 mb-8 text-sm">즐겨찾기·위시리스트를 사용하려면 로그인하세요.</p>
      <button
        type="button"
        onClick={handleKakaoLogin}
        disabled={pending}
        className="w-full py-4 bg-yellow-300 hover:bg-yellow-400 rounded-xl font-semibold text-lg transition-colors disabled:opacity-50"
      >
        {pending ? '로그인 연결 중…' : '🟡 카카오로 시작하기'}
      </button>
      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
      <p className="text-xs text-gray-400 mt-6">검색·도서관 보기는 로그인 없이 사용 가능합니다</p>
    </div>
  )
}
