'use client'

import { LibraryCard } from '@/components/library/library-card'
import { holdingsMessage } from '@/lib/holdings-data.mjs'
import { trackEvent } from '@/lib/analytics'
import { libraryDirectionsUrl, type LinkedHoldingsResult } from '@/lib/library-links.mjs'
import type { ReactNode } from 'react'

interface Props {
  isbn: string
  result: LinkedHoldingsResult | null
  loading: boolean
  error: boolean
  onRetry: () => void
  alternatives?: ReactNode
}

export function HoldingsView({ isbn, result, loading, error, onRetry, alternatives }: Props) {
  if (loading) return <p className="py-8 text-center text-muted-foreground" role="status">주변 도서관 보유 현황을 확인하고 있습니다.</p>
  if (error || !result) return <div className="space-y-4"><div className="rounded-lg border border-border bg-white p-8 text-center" role="alert">
    <p>보유 현황을 잠시 불러올 수 없습니다. 책이 없다는 뜻은 아닙니다.</p>
    <button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-primary px-5 py-2 text-white">다시 시도</button>
  </div>{alternatives}</div>
  const h = result.holdings
  const message = holdingsMessage(result)
  const stale = result.libraries.some((lib) => lib.stale)
  const rows = [...result.libraries].sort((a, b) => {
    const priority = { available: 0, borrowed: 1, unknown: 2, not_held: 3 }
    return priority[a.status] - priority[b.status]
  })
  return <div className="space-y-4">
    {stale && <p className="text-sm text-amber-700" role="status">이전 조회 결과입니다. 대출 가능 상태가 달라졌을 수 있습니다.</p>}
    <p className="text-sm text-muted-foreground" role="status">
      주변 후보 {h.nearbyCount}곳 · 상태 확인 {h.checkedCount}곳 · 소장 확인 {h.heldCount}곳 · 대출 가능 {h.availableCount}곳
      {h.unknownCount > 0 && <span className="block">확인 불가 {h.unknownCount}곳 — 미소장으로 판단하지 않습니다.</span>}
      {h.limited && <span className="block">조회 한도로 후보 중 {h.attemptedCount}곳을 조회했습니다. {h.uncheckedCount}곳은 확인하지 않았습니다.</span>}
    </p>
    {message && <p className="rounded-lg border border-dashed p-6" role="status">{message}</p>}
    {alternatives}
    {rows.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rows.map((lib) => <LibraryCard key={lib.id} libraryId={String(lib.id)} libraryName={lib.name}
        distanceKm={lib.distanceKm} status={lib.status} hasBook={lib.hasBook} checkedAt={lib.checkedAt} stale={lib.stale}
        homepageUrl={lib.homepage} directionsUrl={libraryDirectionsUrl(lib.lat, lib.lng, lib.name)}
        onClick={(action) => trackEvent('library_click', { isbn, libraryId: String(lib.id), libraryName: lib.name,
          action, status: lib.status, distanceKm: lib.distanceKm })} />)}
    </div>}
    <p className="text-xs text-muted-foreground">출처: 도서관 정보나루 · 확인 시각은 이 서비스가 조회한 시각이며, 도서관 재고의 실시간 갱신 시각이 아닙니다. 실제 대출 가능 여부는 도서관 공식 사이트에서 확인해 주세요.</p>
    {rows.length > 0 && <p className="text-xs text-muted-foreground">공식 사이트와 카카오맵 길찾기는 새 탭에서 열립니다. 대출·예약은 도서관 사이트에서 직접 확인해 주세요. 이 서비스에서 예약이 접수되지는 않습니다.</p>}
    {(h.unknownCount > 0 || stale) && <button type="button" onClick={onRetry} className="rounded-lg bg-primary px-5 py-2 text-white">보유 현황 다시 확인</button>}
  </div>
}
