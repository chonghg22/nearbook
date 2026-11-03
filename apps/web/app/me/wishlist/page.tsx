import { getServerSession } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { WishlistView } from './_components/wishlist-view'

export const metadata = { title: '내 위시리스트 | 우리동네책' }

export default async function WishlistPage() {
  const session = await getServerSession()
  if (!session) redirect('/login?next=/me/wishlist')

  return <WishlistView />
}
