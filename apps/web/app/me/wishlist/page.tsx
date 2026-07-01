import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WishlistView } from './_components/wishlist-view'
import { SERVER_API_BASE_URL } from '@/lib/constants'

const API_URL = SERVER_API_BASE_URL

export const metadata = { title: '내 위시리스트 | 우리동네책' }

export default async function WishlistPage() {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login?next=/me/wishlist')

  const res = await fetch(`${API_URL}/me/wishlists`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })

  const json = res.ok
    ? await res.json()
    : { data: [], meta: { plan: 'free', total: 0 } }

  return (
    <WishlistView
      items={json.data ?? []}
      plan={json.meta?.plan ?? 'free'}
      total={json.meta?.total ?? 0}
    />
  )
}
