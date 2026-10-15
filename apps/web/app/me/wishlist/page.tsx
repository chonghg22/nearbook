import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WishlistView } from './_components/wishlist-view'

export const metadata = { title: '내 위시리스트 | 우리동네책' }

export default async function WishlistPage() {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login?next=/me/wishlist')

  return <WishlistView />
}
