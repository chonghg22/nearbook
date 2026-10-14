import Link from 'next/link'
import { MapPin, Navigation } from 'lucide-react'
import { StatusBadge, type Status } from '@/components/ui/status-badge'
import { safeLibraryHomepage } from '@/lib/library-links.mjs'

interface LibraryCardProps {
  libraryId: string
  libraryName: string
  distanceKm?: number | undefined
  walkMinutes?: number | undefined
  checkedAt?: string | null | undefined
  stale?: boolean | undefined
  hasBook?: boolean | null | undefined
  waitingCount?: number | undefined
  status: Status
  homepageUrl?: string | null | undefined
  directionsUrl?: string | null | undefined
  onClick?: ((action: 'library_site' | 'directions') => void) | undefined
}

export function LibraryCard({
  libraryId,
  libraryName,
  distanceKm,
  walkMinutes,
  checkedAt,
  stale,
  hasBook,
  waitingCount,
  status,
  homepageUrl,
  directionsUrl,
  onClick,
}: LibraryCardProps) {
  const homepage = safeLibraryHomepage(homepageUrl)
  const directions = safeLibraryHomepage(directionsUrl)
  return (
    <article className="card-base p-4 flex flex-col gap-3">
      {/* 헤더 행 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {/* 도서관 상세로 가는 내부 링크. 책 상세 → 도서관 상세 크롤 경로를 만든다. */}
            <Link href={`/library/${libraryId}`} className="hover:text-primary hover:underline">
              {libraryName}
            </Link>
          </h3>
          {distanceKm !== undefined && (
            <p className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              기준점에서{' '}
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
              {walkMinutes && ` · 도보 ${walkMinutes}분`}
            </p>
          )}
        </div>
        <StatusBadge status={status} count={waitingCount} />
      </div>

      {/* 소장 현황 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-canvas-subtle rounded-md">
        <span className="text-xs text-muted-foreground">소장 여부</span>
        <span className="text-sm font-medium text-foreground">
          {hasBook === true ? '소장 확인' : hasBook === false ? '미소장' : '확인하지 못함'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        정보나루 ·{' '}
        {checkedAt
          ? `확인: ${new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }).format(new Date(checkedAt))}`
          : '확인 시각 없음'}
        {stale && (
          <span className="block text-amber-700">이전 조회 정보입니다. 다시 확인해 주세요.</span>
        )}
      </p>

      {/* 액션 버튼 */}
      <div className="flex flex-wrap gap-2">
        {homepage ? (
          <a
            href={homepage}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClick?.('library_site')}
            className="flex-1 flex items-center justify-center
                       min-h-11 px-3 rounded-md text-sm font-medium
                       bg-primary text-primary-foreground
                       hover:bg-primary-600 transition-colors"
          >
            공식 사이트에서 확인
            <span className="sr-only"> — {libraryName}, 새 탭</span>
          </a>
        ) : (
          <p className="flex-1 self-center text-xs text-muted-foreground">공식 사이트 정보 없음</p>
        )}
        {directions && (
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClick?.('directions')}
            className="flex items-center justify-center gap-1.5
                       min-h-11 px-3 rounded-md text-sm font-medium
                       bg-white border border-border text-muted-foreground
                       hover:border-primary/40 hover:text-primary
                       transition-colors"
            aria-label={`${libraryName} 길찾기 — 카카오맵, 새 탭`}
          >
            <Navigation className="w-3.5 h-3.5" />
            길찾기
          </a>
        )}
      </div>
    </article>
  )
}
