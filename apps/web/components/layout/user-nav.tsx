import Link from 'next/link'
import { UserNavMenu } from './user-nav-menu'
import { createServerClient } from '@/lib/supabase/server'

export async function UserNav() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
      >
        로그인
      </Link>
    )
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const nickname =
    (meta.nickname as string | undefined) ??
    (meta.name as string | undefined) ??
    user.email?.split('@')[0] ??
    '사용자'
  const avatarUrl = meta.avatar_url as string | undefined

  return <UserNavMenu nickname={nickname} avatarUrl={avatarUrl} />
}
