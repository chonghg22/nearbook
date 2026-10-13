'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createMapResizer, observeElementSize, teardownNaverMap } from '@/lib/map-libraries.mjs'

export interface NaverBounds {
  swLat: number
  swLng: number
  neLat: number
  neLng: number
}

interface UseNaverMapOptions {
  onBoundsChange?: (bounds: NaverBounds) => void
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }
const DEFAULT_ZOOM = 13
const SCRIPT_ID = 'naver-map-sdk'
const SDK_TIMEOUT_MS = 10000

function extractBounds(map: any): NaverBounds {
  const bounds = map.getBounds()
  const sw = bounds.getSW()
  const ne = bounds.getNE()
  return { swLat: sw.lat(), swLng: sw.lng(), neLat: ne.lat(), neLng: ne.lng() }
}

/**
 * SDK 실패·시간 초과는 error로만 알린다. 목록 조회 기준(bounds)을 임의 값으로 덮어쓰지 않는다.
 */
export function useNaverMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseNaverMapOptions = {}
) {
  const mapRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onBoundsChangeRef = useRef(options.onBoundsChange)
  onBoundsChangeRef.current = options.onBoundsChange

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
    const authWindow = window as Window & { navermap_authFailure?: (() => void) | undefined }
    const prevOnError = window.onerror
    const prevAuthFailure = authWindow.navermap_authFailure
    let active = true
    let idleListener: unknown = null
    let stopResizeObserver: (() => void) | null = null
    let script: HTMLScriptElement | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const stopWaiting = () => {
      clearTimeout(timer)
      if (window.onerror === onSdkError) window.onerror = prevOnError
    }
    const teardownMap = () => {
      // 참조를 먼저 비운 뒤 정리한다. 인증 실패로 SDK 내부가 비워져 정리가 던져도 오래된 지도가 남지 않는다.
      const map = mapRef.current
      const listener = idleListener
      const stopObserving = stopResizeObserver
      mapRef.current = null
      idleListener = null
      stopResizeObserver = null
      // 크기 관찰은 SDK 정리 결과와 무관하게 항상 끊는다(던지지 않는다).
      stopObserving?.()
      teardownNaverMap({ map, listeners: [listener], getMaps: () => window.naver?.maps })
    }
    const fail = (message: string) => {
      if (!active) return
      stopWaiting()
      // 실패 상태를 먼저 기록해 정리 결과와 무관하게 부모가 오류를 받게 한다.
      setError(message)
      setIsLoaded(false)
      // 초기화 뒤의 실패(인증 실패 등)에서도 남은 idle 이벤트가 bounds를 바꾸지 못하게 지도를 정리한다.
      teardownMap()
    }
    // Naver SDK 내부 크래시(null.capitalize 등)를 가로채 React 크래시를 막는다.
    const onSdkError: OnErrorEventHandlerNonNull = (message, source, lineno, colno, err) => {
      if (typeof source === 'string' && source.includes('maps.js')) {
        fail('지도 인증 실패')
        return true
      }
      return prevOnError ? prevOnError.call(window, message, source, lineno, colno, err) : false
    }
    // 정리된 지도·언마운트 뒤의 늦은 이벤트는 bounds를 바꾸지 못한다.
    const notifyBounds = (map: unknown) => {
      if (!active || mapRef.current !== map) return
      try {
        onBoundsChangeRef.current?.(extractBounds(map))
      } catch {
        // SDK 내부가 비워진 뒤의 늦은 이벤트는 무시한다.
      }
    }
    const initMap = () => {
      if (!active) return
      const maps = window.naver?.maps
      const container = containerRef.current
      if (!container || !maps) return fail('지도 초기화 실패')
      // 늦은 load 등으로 다시 초기화되면 이전 지도부터 안전하게 정리한다.
      teardownMap()
      try {
        const map = new maps.Map(container, {
          center: new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          zoom: DEFAULT_ZOOM,
        })
        mapRef.current = map
        idleListener = maps.Event.addListener(map, 'idle', () => notifyBounds(map))
        // SDK의 autoResize는 부모 레이아웃 변화(분할↔지도 전환)를 안정적으로 따라가지 못하고, 캐시된 SDK는 부모 effect(모바일 분할→지도 전환)보다
        // 먼저 동기 초기화된다. setSize는 SDK 컨테이너에 픽셀 크기를 직접 쓸 수 있어 그 요소를 관찰하면 이후 변화가 멈추므로,
        // 패딩·테두리 없는 React 래퍼를 관찰해 크기 변화를 setSize로 반영하고(중심 유지) 새 bounds를 알린다. 같은 크기·0 크기·정리된 지도는 무시한다.
        const sizeSource = container.parentElement ?? container
        stopResizeObserver = observeElementSize({
          element: sizeSource,
          onSize: createMapResizer({
            map,
            getMaps: () => window.naver?.maps,
            isCurrent: () => active && mapRef.current === map,
            initial: { width: sizeSource.clientWidth, height: sizeSource.clientHeight },
            onResize: () => notifyBounds(map),
          }),
        })
        stopWaiting()
        // 시간 초과·실패 뒤 SDK가 늦게 로드돼도 초기화에 성공하면 이전 오류를 지운다.
        setError(null)
        setIsLoaded(true)
        onBoundsChangeRef.current?.(extractBounds(map))
      } catch {
        fail('지도 초기화 실패')
      }
    }
    const onScriptError = () => {
      // 다음 마운트에서 다시 로드할 수 있게 실패한 script를 지운다.
      script?.remove()
      fail('지도 SDK 로드 실패')
    }

    const onAuthFailure = () => fail('지도 인증 실패')
    window.onerror = onSdkError
    authWindow.navermap_authFailure = onAuthFailure
    timer = setTimeout(() => fail('지도 로딩 시간 초과'), SDK_TIMEOUT_MS)

    if (!clientId) {
      fail('지도 설정 누락')
    } else if (window.naver?.maps) {
      initMap()
    } else {
      script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = SCRIPT_ID
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`
        script.async = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', initMap)
      script.addEventListener('error', onScriptError)
    }

    return () => {
      active = false
      stopWaiting()
      // 그 사이 다른 지도가 콜백을 바꿨다면 덮어쓰지 않는다.
      if (authWindow.navermap_authFailure === onAuthFailure) authWindow.navermap_authFailure = prevAuthFailure
      script?.removeEventListener('load', initMap)
      script?.removeEventListener('error', onScriptError)
      teardownMap()
    }
  }, [containerRef])

  const moveTo = useCallback((lat: number, lng: number, zoom?: number) => {
    const map = mapRef.current
    const maps = window.naver?.maps
    if (!map || !maps) return
    map.setCenter(new maps.LatLng(lat, lng))
    if (zoom) map.setZoom(zoom)
  }, [])

  return { map: isLoaded ? mapRef.current : null, isLoaded, error, moveTo }
}
