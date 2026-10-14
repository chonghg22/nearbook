'use client'

import { useEffect, useState } from 'react'
import { useLocationContext } from '@/lib/use-location-context'
import { LocationBar } from '@/components/location-bar'
import { Loader2 } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { PUBLIC_API_BASE_URL } from '@/lib/constants'
import { loadHoldings, parseHoldings } from '@/lib/holdings-data.mjs'
import { HoldingsView } from './holdings-view'
import type { HoldingsResult } from '@nearbook/shared-types'

interface Props { isbn: string }

export function LibraryStatus({ isbn }: Props) {
  const { location, isLoaded } = useLocationContext()
  const [result, setResult] = useState<HoldingsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [now, setNow] = useState(Date.now)
  const requestKey = `${isbn}:${location.lat}:${location.lng}:${retryCount}`
  const [resolvedKey, setResolvedKey] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    const controller = new AbortController()
    let active = true
    setIsLoading(true)
    setHasError(false)
    setResult(null)
    void loadHoldings(`${PUBLIC_API_BASE_URL}/books/${encodeURIComponent(isbn)}/holdings?lat=${location.lat}&lng=${location.lng}`, { signal: controller.signal })
      .then((next) => {
        if (!active) return
        setResult(next)
        setNow(Date.now())
        trackEvent('library_status_view', { isbn, libraryCount: next.holdings.heldCount,
          availableCount: next.holdings.availableCount, checkedCount: next.holdings.checkedCount,
          unknownCount: next.holdings.unknownCount, hasLocation: true, source: 'nearby' })
      })
      .catch(() => { if (active) setHasError(true) })
      .finally(() => { if (active) { setResolvedKey(requestKey); setIsLoading(false) } })
    return () => { active = false; controller.abort() }
  }, [isbn, location.lat, location.lng, isLoaded, retryCount, requestKey])

  const loading = !isLoaded || isLoading || resolvedKey !== requestKey
  const current = result ? parseHoldings(result, now) : null
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">📚 주변 도서관 보유 현황</h2>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="mb-4"><LocationBar /></div>
      <HoldingsView isbn={isbn} result={current} loading={loading} error={hasError}
        onRetry={() => setRetryCount((count) => count + 1)} />
    </section>
  )
}
