import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { HeaderAuth } from './header-auth'

export async function Header() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nickname =
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split('@')[0]

  return (
    <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-blue-600">
          우리동네책
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/search" className="text-sm font-medium hover:text-blue-600">
            검색
          </Link>
          <HeaderAuth nickname={nickname} />
        </div>
      </div>
    </header>
  )
}
