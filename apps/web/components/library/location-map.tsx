'use client'

import { useCallback } from 'react'
import { DirectionsButton } from '@/components/maps/directions-button'
import { NaverInteractiveMap } from '@/components/maps/naver-interactive-map'
import type { NaverBounds } from '@/hooks/use-naver-map'

interface Props {
  library: {
    id: number
    lat: number
    lng: number
    name: string
    address: string
  }
}

export function LocationMap({ library }: Props) {
  const lat = Number(library.lat)
  const lng = Number(library.lng)
  const id = Number(library.id)
  const { name, address } = library
  const handleBoundsChange = useCallback((_bounds: NaverBounds) => {
    // 상세 페이지에서는 지도 이동으로 목록을 다시 조회하지 않는다.
  }, [])

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl bg-gray-50 text-sm text-muted-foreground">
        지도 좌표 정보가 없습니다.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[360px] flex-col">
      <div className="min-h-0 flex-1 overflow-hidden bg-gray-100">
        <NaverInteractiveMap
          libraries={[{ id, name, lat, lng }]}
          selectedLibraryId={id}
          onBoundsChange={handleBoundsChange}
          regionCenter={{ lat, lng, zoom: 16 }}
        />
      </div>
      <div className="border-t border-border bg-white p-4">
        <p className="text-xs font-semibold text-foreground">{name}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{address}</p>
        <div className="mt-3">
          <DirectionsButton lat={lat} lng={lng} name={name} />
        </div>
      </div>
    </div>
  )
}
