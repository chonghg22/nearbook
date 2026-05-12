'use client'

import { useEffect } from 'react'

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('SW register failed', error)
    })
  }, [])

  return null
}
