'use client'
import { useEffect, useRef, useState } from 'react'
import { LibraryCard } from '@/components/library/library-card'
import { personalJson, personalErrorMessage, type SavedLibraryCard } from '@/lib/personal-data'
import { parseHoldings } from '@/lib/holdings-data.mjs'
import { libraryDirectionsUrl, type LinkedHoldingsResult } from '@/lib/library-links.mjs'

export function DefaultHolding({ isbn, card }: { isbn: string; card: SavedLibraryCard }) {
  const [result, setResult] = useState<LinkedHoldingsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(Date.now)
  const active = useRef<AbortController | null>(null)
  const busy = useRef(false)
  useEffect(() => {
    setResult(null)
    setError(null)
    setLoading(false)
    busy.current = false
    return () => {
      active.current?.abort()
      busy.current = false
    }
  }, [isbn, card.libraryId])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  async function check() {
    if (busy.current) return
    busy.current = true
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const next = await personalJson(
        `/me/wishlists/${isbn}/holdings?libraryId=${card.libraryId}`,
        parseHoldings,
        { signal: controller.signal }
      )
      if (controller.signal.aborted) return
      if (next.libraries.length !== 1 || next.libraries[0]?.id !== card.libraryId)
        throw new Error('mismatched-default')
      setNow(Date.now())
      setResult(next)
    } catch (cause) {
      if (!controller.signal.aborted) setError(personalErrorMessage(cause))
    } finally {
      if (active.current === controller && !controller.signal.aborted) {
        busy.current = false
        setLoading(false)
      }
    }
  }
  const library = result ? parseHoldings(result, now).libraries[0] : undefined
  return (
    <section aria-label={`${card.library.name} 보유 확인`} className="mt-3 space-y-2">
      <button
        type="button"
        onClick={check}
        disabled={loading}
        className="rounded-full border px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading
          ? '기본 도서관 확인 중…'
          : result || error
            ? '기본 도서관 보유 다시 확인'
            : '기본 도서관에서 보유 확인'}
      </button>
      {loading && (
        <p role="status" className="text-xs text-muted-foreground">
          이 책 한 권을 {card.library.name}에서만 조회합니다.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error} 책이 없다는 뜻은 아닙니다.
        </p>
      )}
      {library && (
        <LibraryCard
          libraryId={String(library.id)}
          libraryName={library.name}
          status={library.status}
          hasBook={library.hasBook}
          checkedAt={library.checkedAt}
          stale={library.stale}
          homepageUrl={library.homepage}
          directionsUrl={libraryDirectionsUrl(library.lat, library.lng, library.name)}
        />
      )}
    </section>
  )
}
