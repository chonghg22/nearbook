'use client'

import { useRef, useEffect } from 'react'
import { MapErrorBoundary } from './map-error-boundary'
import { useNaverMap, type NaverBounds } from '@/hooks/use-naver-map'
import { escapeHtml } from '@/lib/map-libraries.mjs'

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
  onMapErrorChange?: ((error: string | null) => void) | undefined
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
  <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="#2f704f"/>
  <circle cx="14" cy="14" r="6" fill="white"/>
</svg>
`

const NO_LIBRARIES: Library[] = []

function MapInner({
  onBoundsChange,
  libraries = NO_LIBRARIES,
  selectedLibraryId,
  onMarkerClick,
  onMapErrorChange,
  regionCenter,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const infoWindowRef = useRef<any>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick
  const onMapErrorChangeRef = useRef(onMapErrorChange)
  onMapErrorChangeRef.current = onMapErrorChange
  const { map, isLoaded, error, moveTo } = useNaverMap(containerRef, { onBoundsChange })

  useEffect(() => {
    onMapErrorChangeRef.current?.(error)
  }, [error])

  // 객체 동일성이 아니라 좌표 값이 바뀔 때만 이동한다.
  const centerLat = regionCenter?.lat
  const centerLng = regionCenter?.lng
  const centerZoom = regionCenter?.zoom
  useEffect(() => {
    if (isLoaded && centerLat !== undefined && centerLng !== undefined) {
      moveTo(centerLat, centerLng, centerZoom ?? 13)
    }
  }, [isLoaded, centerLat, centerLng, centerZoom, moveTo])

  // 지도 클릭 시 InfoWindow 닫기 (지도당 한 번만 등록)
  useEffect(() => {
    const maps = window.naver?.maps
    if (!isLoaded || !map || !maps) return
    const listener = maps.Event.addListener(map, 'click', () => infoWindowRef.current?.close())
    return () => maps.Event.removeListener(listener)
  }, [isLoaded, map])

  // 마커 목록이 바뀌거나 언마운트되면 이전 지역의 InfoWindow를 닫는다.
  useEffect(() => () => infoWindowRef.current?.close(), [libraries, map])

  useEffect(() => {
    const maps = window.naver?.maps
    if (!isLoaded || !map || !maps) return

    // InfoWindow 초기화
    if (!infoWindowRef.current) {
      infoWindowRef.current = new maps.InfoWindow({
        borderWidth: 0,
        backgroundColor: 'transparent',
        disableAnchor: true,
      } as any)
    }

    const markers: any[] = []
    const listeners: unknown[] = []
    libraries.forEach((lib) => {
      try {
        const isSelected = lib.id === selectedLibraryId
        const marker = new maps.Marker({
          position: new maps.LatLng(lib.lat, lib.lng),
          map,
          icon: {
            content: isSelected ? PIN_SELECTED : PIN_NORMAL,
            size: new (maps as any).Size(isSelected ? 34 : 28, isSelected ? 44 : 36),
            anchor: new (maps as any).Point(
              isSelected ? 17 : 14,
              isSelected ? 44 : 36
            ),
          },
          zIndex: isSelected ? 10 : 1,
        } as any)

        // 클릭: InfoWindow 표시. 도서관 이름은 HTML로 해석되지 않게 escape한다.
        listeners.push(maps.Event.addListener(marker, 'click', () => {
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
              <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 6px">${escapeHtml(lib.name)}</p>
              <a
                href="/library/${encodeURIComponent(String(lib.id))}"
                style="font-size:12px;color:#2f704f;text-decoration:none;"
              >상세보기 →</a>
            </div>
          `)
          iw.open(map, marker)
          onMarkerClickRef.current?.(lib.id)
        }))

        markers.push(marker)
      } catch (e) {
        console.warn(`마커 생성 실패 (id=${lib.id}):`, e)
      }
    })

    return () => {
      listeners.forEach((listener) => maps.Event.removeListener(listener))
      markers.forEach((m) => {
        try { m.setMap(null) } catch (_) {}
      })
    }
  }, [libraries, selectedLibraryId, isLoaded, map])

  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      <div ref={containerRef} className="w-full h-full" />
      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-full z-10 pointer-events-none whitespace-nowrap">
          ⚠️ 지도를 불러오지 못했습니다
        </div>
      )}
    </div>
  )
}

export function NaverInteractiveMap(props: Props) {
  return (
    <MapErrorBoundary onError={props.onMapErrorChange}>
      <MapInner {...props} />
    </MapErrorBoundary>
  )
}
