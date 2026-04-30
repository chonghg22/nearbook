import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { MeNav } from '@/components/me/me-nav'

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
