import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { MeNav } from '@/components/me/me-nav'

// 로그인한 사용자의 개인 데이터 화면. 색인도 링크 추적도 하지 않는다.
export const metadata: Metadata = {
  title: '마이페이지',
  robots: { index: false, follow: false },
}

export default async function MeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/me')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <MeNav />
      {children}
    </div>
  )
}
