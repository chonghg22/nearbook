'use client'

import { useRef, useEffect } from 'react'
import { MapErrorBoundary } from './map-error-boundary'
import { useNaverMap, type NaverBounds } from '@/hooks/use-naver-map'
import { createMarkerLayer, runCleanup } from '@/lib/map-libraries.mjs'

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
  /** 목록 조회 범위(선택 지역 또는 지도 bounds). 바뀌면 열린 InfoWindow를 닫는다. */
  scopeKey?: string | undefined
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

const PINS = {
  normal: { content: PIN_NORMAL, width: 28, height: 36, zIndex: 1 },
  selected: { content: PIN_SELECTED, width: 34, height: 44, zIndex: 10 },
}

type MarkerLayer = ReturnType<typeof createMarkerLayer>

interface MarkerHandle {
  marker: any
  listener: unknown
}

function MapInner({
  onBoundsChange,
  libraries = NO_LIBRARIES,
  selectedLibraryId,
  onMarkerClick,
  onMapErrorChange,
  regionCenter,
  scopeKey = '',
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<MarkerLayer | null>(null)
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

  // 지도마다 마커 레이어 하나를 둔다. 마커는 도서관 id로 유지해 같은 범위의 목록 갱신·선택 변경에서 다시 만들지 않는다.
  // 가장자리 마커의 InfoWindow 자동 이동은 idle → bounds 재조회를 일으키므로, 목록이 바뀔 때마다 닫으면 팝업이 사라진다.
  useEffect(() => {
    const maps: any = window.naver?.maps
    if (!isLoaded || !map || !maps) return

    const infoWindow = new maps.InfoWindow({
      borderWidth: 0,
      backgroundColor: 'transparent',
      disableAnchor: true,
    })
    const pinIcon = (selected: boolean) => {
      const pin = selected ? PINS.selected : PINS.normal
      return {
        content: pin.content,
        size: new maps.Size(pin.width, pin.height),
        anchor: new maps.Point(pin.width / 2, pin.height),
      }
    }
    const layer = createMarkerLayer<MarkerHandle>({
      createMarker(library, selected, open) {
        const marker = new maps.Marker({
          position: new maps.LatLng(library.lat, library.lng),
          map,
          icon: pinIcon(selected),
          zIndex: (selected ? PINS.selected : PINS.normal).zIndex,
        })
        try {
          // 클릭: InfoWindow 표시. 내용은 레이어가 escape된 HTML(libraryPopupHtml)로 만든다.
          const listener = maps.Event.addListener(marker, 'click', () => {
            open()
            onMarkerClickRef.current?.(library.id)
          })
          return { marker, listener }
        } catch (error) {
          runCleanup(() => marker.setMap(null))
          throw error
        }
      },
      setPosition: ({ marker }, library) => marker.setPosition(new maps.LatLng(library.lat, library.lng)),
      setSelected: ({ marker }, selected) => {
        marker.setIcon(pinIcon(selected))
        marker.setZIndex((selected ? PINS.selected : PINS.normal).zIndex)
      },
      removeMarker: ({ marker, listener }) => {
        runCleanup(() => maps.Event?.removeListener(listener), () => marker.setMap(null))
      },
      openPopup: ({ marker }, html) => {
        infoWindow.setContent(html)
        infoWindow.open(map, marker)
      },
      updatePopup: ({ marker }, html, moved) => {
        infoWindow.setContent(html)
        if (moved) infoWindow.open(map, marker)
      },
      closePopup: () => infoWindow.close(),
    }, {
      onCreateError: (id, error) => console.warn(`마커 생성 실패 (id=${id}):`, error),
    })
    layerRef.current = layer
    // 지도 클릭 시 InfoWindow 닫기 (지도당 한 번만 등록)
    const clickListener = maps.Event.addListener(map, 'click', () => layer.close())
    return () => {
      // 지도가 사라지면(인증 실패 포함) 마커와 InfoWindow를 모두 버린다. 다음 지도는 새 레이어를 만든다.
      if (layerRef.current === layer) layerRef.current = null
      runCleanup(() => maps.Event?.removeListener(clickListener), () => layer.destroy())
    }
  }, [isLoaded, map])

  // 같은 범위의 목록 갱신·로딩 중에는 마커와 열린 InfoWindow를 유지한다.
  // 범위(지역)가 바뀌거나 열린 도서관이 확정된 목록에서 빠지면 닫는다.
  useEffect(() => {
    layerRef.current?.sync(libraries, selectedLibraryId, scopeKey)
  }, [libraries, selectedLibraryId, scopeKey, isLoaded, map])

  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      <div ref={containerRef} className="w-full h-full" />
      {/* 오류를 받는 부모가 있으면 부모가 대체 안내를 띄우므로 중복 표시하지 않는다. */}
      {error && !onMapErrorChange && (
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
