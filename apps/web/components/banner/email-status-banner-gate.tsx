'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { EmailStatusBanner } from './email-status-banner'

export function EmailStatusBannerGate() {
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    apiFetch('/me/notification-preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) {
          setStatus(json?.data?.emailStatus ?? null)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  if (!status) return null

  return <EmailStatusBanner status={status} />
}
