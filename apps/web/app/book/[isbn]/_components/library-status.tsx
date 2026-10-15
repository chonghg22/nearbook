'use client'

import { useEffect, useState } from 'react'
import { useLocationContext } from '@/lib/use-location-context'
import { LocationBar } from '@/components/location-bar'
import { Loader2 } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { publicApiJson } from '@/lib/public-api-client'
import { parseHoldings } from '@/lib/holdings-data.mjs'
import { HoldingsView } from './holdings-view'
import type { LinkedHoldingsResult } from '@/lib/library-links.mjs'
import { HOLDING_RADII, type HoldingRadius } from '@/lib/holdings-alternatives'
import { HoldingsAlternatives } from './holdings-alternatives'
import { markUsefulAction } from '@/lib/pwa-install-eligibility'

interface Props {
  isbn: string
  bookTitle?: string
}

export function LibraryStatus({ isbn, bookTitle }: Props) {
  const { location, isLoaded } = useLocationContext()
  const [result, setResult] = useState<LinkedHoldingsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [now, setNow] = useState(Date.now)
  const referenceKey = `${isbn}:${JSON.stringify(location)}`
  const [radiusChoice, setRadiusChoice] = useState<{ key: string; km: HoldingRadius }>({
    key: referenceKey,
    km: 5,
  })
  const radiusKm = radiusChoice.key === referenceKey ? radiusChoice.km : 5
  const requestKey = `${referenceKey}:${radiusKm}:${retryCount}`
  const [resolvedKey, setResolvedKey] = useState('')

  useEffect(() => {
    setRadiusChoice((previous) =>
      previous.key === referenceKey ? previous : { key: referenceKey, km: 5 }
    )
  }, [referenceKey])

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
    void publicApiJson(
      `/books/${encodeURIComponent(isbn)}/holdings?lat=${location.lat}&lng=${location.lng}&radius=${radiusKm}`,
      parseHoldings,
      { timeoutMs: 15000, signal: controller.signal }
    )
      .then((next) => {
        if (!active) return
        setResult(next)
        if (next.holdings.checkedCount > 0) markUsefulAction()
        setNow(Date.now())
        trackEvent('library_status_view', {
          isbn,
          libraryCount: next.holdings.heldCount,
          availableCount: next.holdings.availableCount,
          checkedCount: next.holdings.checkedCount,
          unknownCount: next.holdings.unknownCount,
          hasLocation: true,
          radiusKm,
          source: 'nearby',
        })
      })
      .catch(() => {
        if (active) setHasError(true)
      })
      .finally(() => {
        if (active) {
          setResolvedKey(requestKey)
          setIsLoading(false)
        }
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [isbn, location.lat, location.lng, isLoaded, radiusKm, retryCount, requestKey])

  const loading = !isLoaded || isLoading || resolvedKey !== requestKey
  const current = result ? parseHoldings(result, now) : null
  const changeRadius = (km: HoldingRadius) => {
    if (loading || radiusKm === km) return
    setRadiusChoice({ key: referenceKey, km })
  }
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">📚 주변 도서관 보유 현황</h2>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="mb-4">
        <LocationBar />
      </div>
      <fieldset className="mb-4" disabled={loading}>
        <legend className="mb-2 text-sm font-medium">조회 반경</legend>
        <div className="flex flex-wrap gap-2">
          {HOLDING_RADII.map((km) => (
            <button
              key={km}
              type="button"
              aria-pressed={radiusKm === km}
              onClick={() => changeRadius(km)}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm disabled:opacity-50 ${radiusKm === km ? 'border-primary bg-primary text-white' : 'border-border bg-white text-foreground'}`}
            >
              {km}km
            </button>
          ))}
        </div>
      </fieldset>
      <p className="mb-4 text-xs text-muted-foreground">
        기준점 반경 {radiusKm}km 내 최대 30곳을 후보로 찾고, 소장 후보를 우선해 최대 10곳의 상태를
        확인합니다. 반경은 선택했을 때만 바뀝니다.
      </p>
      <HoldingsView
        isbn={isbn}
        result={current}
        loading={loading}
        error={hasError}
        onRetry={() => setRetryCount((count) => count + 1)}
        alternatives={
          !loading && (hasError || current?.holdings.availableCount === 0) ? (
            <HoldingsAlternatives
              bookTitle={bookTitle}
              radiusKm={radiusKm}
              onRadiusChange={changeRadius}
            />
          ) : undefined
        }
      />
    </section>
  )
}
