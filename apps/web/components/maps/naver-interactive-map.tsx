'use client'

import { useRef, useEffect, useCallback } from 'react'
import { MapErrorBoundary } from './map-error-boundary'
import { useNaverMap, type NaverBounds } from '@/hooks/use-naver-map'

interface Library {
  id: number
  name: string
  lat: number
  lng: number
}

interface Props {
  onBoundsChange: (bounds: NaverBounds) => void
  libraries?: Library[]
  selectedLibraryId?: number | null
  onMarkerClick?: (id: number) => void
  regionCenter?: { lat: number; lng: number; zoom?: number } | undefined
  className?: string
}

// 핀 SVG 아이콘
const PIN_NORMAL = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
  <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="#ef4444"/>
  <circle cx="14" cy="14" r="6" fill="white"/>
</svg>
`

const PIN_SELECTED = `
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 28 36">
  <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="#2563eb"/>
  <circle cx="14" cy="14" r="6" fill="white"/>
</svg>
`

function MapInner({
  onBoundsChange,
  libraries = [],
  selectedLibraryId,
  onMarkerClick,
  regionCenter,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<number, any>>(new Map())
  const infoWindowRef = useRef<any>(null)
  const { map, isLoaded, error, moveTo } = useNaverMap(containerRef, { onBoundsChange })

  useEffect(() => {
    if (regionCenter && isLoaded) {
      moveTo(regionCenter.lat, regionCenter.lng, regionCenter.zoom ?? 13)
    }
  }, [regionCenter, isLoaded])

  useEffect(() => {
    if (!isLoaded || !map) return

    // 기존 마커 제거
    markersRef.current.forEach((m) => {
      try { m.setMap(null) } catch (_) {}
    })
    markersRef.current.clear()

    // InfoWindow 초기화
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.naver.maps.InfoWindow({
        borderWidth: 0,
        backgroundColor: 'transparent',
        disableAnchor: true,
      } as any)
    }

    libraries.forEach((lib) => {
      try {
        const isSelected = lib.id === selectedLibraryId
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(lib.lat, lib.lng),
          map,
          icon: {
            content: isSelected ? PIN_SELECTED : PIN_NORMAL,
            size: new (window.naver.maps as any).Size(isSelected ? 34 : 28, isSelected ? 44 : 36),
            anchor: new (window.naver.maps as any).Point(
              isSelected ? 17 : 14,
              isSelected ? 44 : 36
            ),
          },
          zIndex: isSelected ? 10 : 1,
        } as any)

        // 클릭: InfoWindow 표시
        window.naver.maps.Event.addListener(marker, 'click', () => {
          const iw = infoWindowRef.current
          iw.setContent(`
            <div style="
              background:white;
              border-radius:8px;
              box-shadow:0 2px 8px rgba(0,0,0,.15);
              padding:10px 14px;
              min-width:140px;
              text-align:center;
            ">
              <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 6px">${lib.name}</p>
              <a
                href="/library/${lib.id}"
                style="font-size:12px;color:#2563eb;text-decoration:none;"
              >상세보기 →</a>
            </div>
          `)
          iw.open(map, marker)
          onMarkerClick?.(lib.id)
        })

        markersRef.current.set(lib.id, marker)
      } catch (e) {
        console.warn(`마커 생성 실패 (id=${lib.id}):`, e)
      }
    })

    // 지도 클릭 시 InfoWindow 닫기
    window.naver.maps.Event.addListener(map, 'click', () => {
      infoWindowRef.current?.close()
    })
  }, [libraries, selectedLibraryId, isLoaded, map])

  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      <div ref={containerRef} className="w-full h-full" />
      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-full z-10 pointer-events-none whitespace-nowrap">
          ⚠️ 지도 인증 실패
        </div>
      )}
    </div>
  )
}

export function NaverInteractiveMap(props: Props) {
  return (
    <MapErrorBoundary>
      <MapInner {...props} />
    </MapErrorBoundary>
  )
}
