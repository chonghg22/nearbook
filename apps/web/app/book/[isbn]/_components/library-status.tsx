'use client'

import { useEffect, useState } from 'react'
import { LibraryCard } from '@/components/library/library-card'
import { useLocationContext } from '@/lib/use-location-context'
import { LocationBar } from '@/components/location-bar'
import type { Status } from '@/components/ui/status-badge'
import { Loader2 } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { PUBLIC_API_BASE_URL } from '@/lib/constants'

interface Props {
  isbn: string
}

export function LibraryStatus({ isbn }: Props) {
  const { location, isLoaded } = useLocationContext()
  const [libraries, setLibraries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!isLoaded) return

    const controller = new AbortController()
    let active = true
    const timer = setTimeout(() => controller.abort(), 15000)
    const fetchNearby = async () => {
      setIsLoading(true)
      setHasError(false)
      setLibraries([])
      try {
        const res = await fetch(`${PUBLIC_API_BASE_URL}/books/${encodeURIComponent(isbn)}/with-libraries?lat=${location.lat}&lng=${location.lng}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Holdings request failed')
        const data = await res.json()
        if (!Array.isArray(data?.libraries) || data.libraries.some((lib: unknown) => !lib || typeof lib !== 'object' || Array.isArray(lib))) {
          throw new Error('Invalid holdings response')
        }
        if (!active) return
        const nextLibraries = data.libraries
        setLibraries(nextLibraries)
        trackEvent('library_status_view', {
          isbn,
          libraryCount: nextLibraries.length,
          availableCount: nextLibraries.filter((lib: any) => lib.holdingCount > 0).length,
          hasLocation: true,
          source: 'nearby',
        })
      } catch {
        if (active) setHasError(true)
      } finally {
        clearTimeout(timer)
        if (active) setIsLoading(false)
      }
    }
    void fetchNearby()
    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [isbn, location.lat, location.lng, isLoaded, retryCount])

  const heldLibraries = libraries.filter((lib: any) => lib.holdingCount > 0)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          📚 주변 도서관 보유 현황
        </h2>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="mb-4">
        <LocationBar />
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground" role="status">주변 도서관 보유 현황을 확인하고 있습니다.</p>
      ) : hasError ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center" role="alert">
          <p className="text-muted-foreground">보유 현황을 잠시 불러올 수 없습니다. 책이 없다는 뜻은 아닙니다.</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-4 rounded-lg bg-primary px-5 py-2 text-white">다시 시도</button>
        </div>
      ) : heldLibraries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {heldLibraries.map((lib: any) => {
            const status: Status = lib.loanAvailable ? 'available' : 'borrowed'
            return (
              <LibraryCard
                key={String(lib.id)}
                libraryId={String(lib.id)}
                libraryName={String(lib.name ?? '')}
                distanceKm={lib.distanceKm}
                availableCount={lib.loanAvailable ? 1 : 0}
                status={status}
                onClick={(action) => {
                  trackEvent('library_click', {
                    isbn,
                    libraryId: String(lib.id),
                    libraryName: String(lib.name ?? ''),
                    action,
                    status,
                    distanceKm: lib.distanceKm,
                  })
                }}
              />
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-border border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground">현재 조회 결과에 보유 도서관이 표시되지 않습니다. 도서관 공식 사이트에서 한 번 더 확인해 주세요.</p>
        </div>
      )}
    </section>
  )
}
