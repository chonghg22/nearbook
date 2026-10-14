'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { accountBoundary, clearPwaCaches } from '@/lib/pwa-privacy.mjs'

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const clear = () => clearPwaCaches(window.caches, true)
    const hide = () => { document.body.style.visibility = 'hidden' }
    const reload = () => window.location.replace('/')
    const observe = accountBoundary({ clear, hide, reload })
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
      // Explicit logout waits for both browser and server cookie cleanup.
      if (document.documentElement.dataset.accountLogout === 'true') return
      observe(session?.user.id ?? null)
    })
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) { hide(); window.location.reload() }
    }
    window.addEventListener('pageshow', onPageShow)
    void clearPwaCaches(window.caches).catch(() => {})
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((error: unknown) => {
        console.warn('SW register failed', error)
      })
    }
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return null
}
