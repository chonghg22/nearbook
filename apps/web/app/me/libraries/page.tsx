import { getServerSession } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { LibraryCardsView } from './_components/library-cards-view'

export const metadata = { title: '내 도서관 | 우리동네책' }

export default async function LibrariesPage() {
  const session = await getServerSession()
  if (!session) redirect('/login?next=/me/libraries')

  return <LibraryCardsView />
}
