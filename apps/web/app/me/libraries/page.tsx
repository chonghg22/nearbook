import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LibraryCardsView } from './_components/library-cards-view'

export const metadata = { title: '내 도서관 | 우리동네책' }

export default async function LibrariesPage() {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login?next=/me/libraries')

  return <LibraryCardsView />
}
