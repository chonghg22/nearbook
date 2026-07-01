import { MapPin, Navigation } from 'lucide-react'
import { StatusBadge, type Status } from '@/components/ui/status-badge'

interface LibraryCardProps {
  libraryId: string
  libraryName: string
  distanceKm?: number | undefined
  walkMinutes?: number | undefined
  availableCount: number
  waitingCount?: number | undefined
  status: Status
  reservationUrl?: string | undefined
  directionsUrl?: string | undefined
  onClick?: ((action: 'library_site' | 'directions') => void) | undefined
}

export function LibraryCard({
  libraryId, libraryName, distanceKm, walkMinutes,
  availableCount, waitingCount, status,
  reservationUrl, directionsUrl, onClick,
}: LibraryCardProps) {
  return (
    <article className="card-base p-4 flex flex-col gap-3">
      {/* 헤더 행 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {libraryName}
          </h3>
          {distanceKm !== undefined && (
            <p className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)}m`
                : `${distanceKm.toFixed(1)}km`}
              {walkMinutes && ` · 도보 ${walkMinutes}분`}
            </p>
          )}
        </div>
        <StatusBadge status={status} count={waitingCount} />
      </div>

      {/* 소장 현황 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-canvas-subtle rounded-md">
        <span className="text-xs text-muted-foreground">소장</span>
        <span className="text-sm font-medium text-foreground">{availableCount}권 대출 가능</span>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        {reservationUrl && (
          <a
            href={reservationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClick?.('library_site')}
            className="flex-1 flex items-center justify-center
                       h-9 rounded-md text-sm font-medium
                       bg-primary text-primary-foreground
                       hover:bg-primary-600 transition-colors"
          >
            도서관에서 확인
          </a>
        )}
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClick?.('directions')}
            className="flex items-center justify-center gap-1.5
                       h-9 px-3 rounded-md text-sm font-medium
                       bg-white border border-border text-muted-foreground
                       hover:border-primary/40 hover:text-primary
                       transition-colors"
            aria-label="길찾기"
          >
            <Navigation className="w-3.5 h-3.5" />
            길찾기
          </a>
        )}
      </div>
    </article>
  )
}
