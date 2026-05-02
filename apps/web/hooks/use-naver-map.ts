'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

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

const SEOUL_DEFAULT_BOUNDS: NaverBounds = {
  swLat: 37.4979, swLng: 126.8625,
  neLat: 37.6351, neLng: 127.0937,
}

export function useNaverMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseNaverMapOptions = {}
) {
  const mapRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onBoundsChangeRef = useRef(options.onBoundsChange)
  onBoundsChangeRef.current = options.onBoundsChange

  const extractBounds = useCallback((map: any): NaverBounds => {
    const bounds = map.getBounds()
    const sw = bounds.getSW()
    const ne = bounds.getNE()
    return { swLat: sw.lat(), swLng: sw.lng(), neLat: ne.lat(), neLng: ne.lng() }
  }, [])

  const handleError = useCallback((msg: string) => {
    setError(msg)
    setIsLoaded(false)
    // 인증 실패여도 기본 bounds로 도서관 목록은 표시
    onBoundsChangeRef.current?.(SEOUL_DEFAULT_BOUNDS)
  }, [])

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
    console.log('[NaverMap] ENV 디버그:', {
      clientId,
      raw: process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID,
      type: typeof clientId,
      length: clientId?.length,
    })
    if (!clientId) {
      handleError('NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 누락')
      return
    }

    // Naver SDK 내부 크래시(null.capitalize 등) 가로채기
    const prevOnError = window.onerror
    window.onerror = (message, source) => {
      if (source && source.includes('maps.js')) {
        handleError('Naver Maps 인증 실패 (localhost 미등록)')
        window.onerror = prevOnError
        return true // 에러 전파 차단 → React 크래시 방지
      }
      return false
    }

    if (window.naver?.maps) {
      initMap()
      window.onerror = prevOnError
      return
    }

    // 중복 script 방지
    if (document.getElementById('naver-map-sdk')) {
      document.getElementById('naver-map-sdk')!.addEventListener('load', () => {
        initMap()
        window.onerror = prevOnError
      })
      return
    }

    const scriptUrl = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`
    console.log('[NaverMap] SDK URL:', scriptUrl)

    const script = document.createElement('script')
    script.id = 'naver-map-sdk'
    script.src = scriptUrl
    script.async = true
    script.onload = () => {
      console.log('[NaverMap] SDK 로드 성공, naver.maps 존재:', !!window.naver?.maps)
      initMap()
      window.onerror = prevOnError
    }
    script.onerror = (e) => {
      console.error('[NaverMap] SDK 로드 실패:', e)
      handleError('Naver Maps SDK 로드 실패')
      window.onerror = prevOnError
    }
    document.head.appendChild(script)

    return () => {
      window.onerror = prevOnError
    }
  }, [])

  function initMap() {
    if (!containerRef.current || !window.naver?.maps) return
    try {
      const map = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        zoom: DEFAULT_ZOOM,
      })
      mapRef.current = map
      setIsLoaded(true)

      // 즉시 bounds 전달
      onBoundsChangeRef.current?.(extractBounds(map))

      window.naver.maps.Event.addListener(map, 'idle', () => {
        onBoundsChangeRef.current?.(extractBounds(map))
      })
    } catch (err) {
      handleError('지도 초기화 실패')
    }
  }

  const moveTo = (lat: number, lng: number, zoom?: number) => {
    if (!mapRef.current || !isLoaded) return
    mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng))
    if (zoom) mapRef.current.setZoom(zoom)
  }

  return { map: mapRef.current, isLoaded, error, moveTo }
}
