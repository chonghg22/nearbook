'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

const VISIT_COUNT_KEY = 'pwa-visit-count'
const VISIT_SESSION_KEY = 'pwa-visit-session-marked'
const BOOK_VIEW_COUNT_KEY = 'pwa-book-view-count'
const LAST_BOOK_KEY = 'pwa-last-book-path'
const LAST_SOURCE_KEY = 'pwa-last-source'

export function PwaRouteTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (
      lastPath.current !== pathname &&
      !/^\/(?:me|login|auth|unsubscribe)(?:\/|$)/.test(pathname)
    ) {
      lastPath.current = pathname
      trackEvent('page_view')
    }

    try {
      if (!window.sessionStorage.getItem(VISIT_SESSION_KEY)) {
        const nextCount = Number(window.localStorage.getItem(VISIT_COUNT_KEY) || 0) + 1
        window.localStorage.setItem(VISIT_COUNT_KEY, String(nextCount))
        window.sessionStorage.setItem(VISIT_SESSION_KEY, '1')
      }

      if (pathname.startsWith('/book/')) {
        const lastBook = window.sessionStorage.getItem(LAST_BOOK_KEY)
        if (lastBook !== pathname) {
          const nextCount = Number(window.localStorage.getItem(BOOK_VIEW_COUNT_KEY) || 0) + 1
          window.localStorage.setItem(BOOK_VIEW_COUNT_KEY, String(nextCount))
          window.sessionStorage.setItem(LAST_BOOK_KEY, pathname)
        }
      }
      const searchParams = new URLSearchParams(window.location.search)
      const source = searchParams.get('source')
      if (source === 'pwa' || source === 'scan') {
        const dedupeKey = `${source}:${pathname}`
        if (window.sessionStorage.getItem(LAST_SOURCE_KEY) !== dedupeKey) {
          trackEvent('source_visit', { source, pathname })
          window.sessionStorage.setItem(LAST_SOURCE_KEY, dedupeKey)
        }
      }
    } catch {
      // Denied storage must not interrupt navigation or the public event attempt.
    }
  }, [pathname])

  return null
}
