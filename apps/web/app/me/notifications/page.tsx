import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { NotificationSettingsForm } from './_components/notification-settings-form'
import { SERVER_API_BASE_URL } from '@/lib/constants'

const API_URL = SERVER_API_BASE_URL

export const metadata = { title: '알림 설정 | 우리동네책' }

export default async function NotificationsPage() {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?next=/me/notifications')
  }

  const res = await fetch(`${API_URL}/me/notification-preferences`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })

  const json = res.ok
    ? await res.json()
    : {
      data: {
        emailOnAvailable: true,
        email: session.user.email ?? null,
        emailStatus: 'active',
        digestFrequency: 'daily',
        softBounceCount: 0,
        lastBounceReason: null,
      },
    }

  return (
    <NotificationSettingsForm
      emailOnAvailable={Boolean(json.data?.emailOnAvailable)}
      email={json.data?.email ?? session.user.email ?? null}
      emailStatus={json.data?.emailStatus ?? 'active'}
      digestFrequency={json.data?.digestFrequency ?? 'daily'}
      softBounceCount={Number(json.data?.softBounceCount ?? 0)}
      lastBounceReason={json.data?.lastBounceReason ?? null}
    />
  )
}
