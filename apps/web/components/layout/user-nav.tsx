'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserNavMenu } from './user-nav-menu'
import { createClient } from '@/lib/supabase/client'

export function UserNav() {
  const [state, setState] = useState<'loading' | 'logged-out' | 'logged-in'>('loading')
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()

  useEffect(() => {
    const supabase = createClient()
    function applyUser(user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']) {
      if (!user) {
        setNickname('')
        setAvatarUrl(undefined)
        setState('logged-out')
        return
      }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      setNickname(
        (meta.nickname as string | undefined) ??
        (meta.name as string | undefined) ??
        user.email?.split('@')[0] ??
        '사용자'
      )
      setAvatarUrl(meta.avatar_url as string | undefined)
      setState('logged-in')
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      applyUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (state === 'loading') {
    return <div className="w-20 h-9 rounded-full bg-gray-100 animate-pulse" />
  }

  if (state === 'logged-out') {
    return (
      <Link
        href="/login"
        className="rounded-full border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
      >
        로그인
      </Link>
    )
  }

  return <UserNavMenu nickname={nickname} avatarUrl={avatarUrl} />
}
