import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LibraryCardsView } from './_components/library-cards-view'

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

export const metadata = { title: '내 도서관 | 우리동네책' }

export default async function LibrariesPage() {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login?next=/me/libraries')

  const res = await fetch(`${API_URL}/me/library-cards`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })

  const json = res.ok ? await res.json() : { data: [], meta: { plan: 'free' } }

  return (
    <LibraryCardsView
      cards={json.data ?? []}
      plan={json.meta?.plan ?? 'free'}
    />
  )
}
