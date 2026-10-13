'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
    let script: HTMLScriptElement | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const stopWaiting = () => {
      clearTimeout(timer)
      if (window.onerror === onSdkError) window.onerror = prevOnError
    }
    const fail = (message: string) => {
      if (!active) return
      stopWaiting()
      setError(message)
      setIsLoaded(false)
    }
    // Naver SDK 내부 크래시(null.capitalize 등)를 가로채 React 크래시를 막는다.
    const onSdkError: OnErrorEventHandlerNonNull = (message, source, lineno, colno, err) => {
      if (typeof source === 'string' && source.includes('maps.js')) {
        fail('지도 인증 실패')
        return true
      }
      return prevOnError ? prevOnError.call(window, message, source, lineno, colno, err) : false
    }
    const initMap = () => {
      if (!active) return
      const maps = window.naver?.maps
      if (!containerRef.current || !maps) return fail('지도 초기화 실패')
      try {
        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          zoom: DEFAULT_ZOOM,
        })
        mapRef.current = map
        idleListener = maps.Event.addListener(map, 'idle', () => onBoundsChangeRef.current?.(extractBounds(map)))
        stopWaiting()
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

    window.onerror = onSdkError
    authWindow.navermap_authFailure = () => fail('지도 인증 실패')
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
      authWindow.navermap_authFailure = prevAuthFailure
      script?.removeEventListener('load', initMap)
      script?.removeEventListener('error', onScriptError)
      if (idleListener) window.naver?.maps.Event.removeListener(idleListener)
      mapRef.current?.destroy?.()
      mapRef.current = null
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
