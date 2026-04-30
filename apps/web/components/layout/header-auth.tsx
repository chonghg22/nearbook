'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function HeaderAuth({ nickname }: { nickname?: string | undefined }) {
  const supabase = createClient()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!nickname) {
    return (
      <a href="/login" className="text-sm text-blue-600 hover:underline">
        로그인
      </a>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <a href="/me" className="text-sm font-medium">
        {nickname}님
      </a>
      <button
        onClick={handleSignOut}
        className="text-xs text-gray-500 hover:text-red-500"
      >
        로그아웃
      </button>
    </div>
  )
}
