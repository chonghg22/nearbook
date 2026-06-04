import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { EventApplicationsView } from './_components/event-applications-view'

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

export const metadata = { title: '내 문화행사 신청 | 우리동네책' }

export default async function MyEventApplicationsPage() {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login?next=/me/events')

  const res = await fetch(`${API_URL}/me/event-applications`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })

  const json = res.ok ? await res.json() : { data: [] }

  return <EventApplicationsView items={json.data ?? []} />
}
