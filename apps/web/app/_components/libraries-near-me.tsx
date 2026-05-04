'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { MapPin, Navigation, Loader2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { NaverInteractiveMap } from '@/components/maps/naver-interactive-map'
import { useLocationContext } from '@/lib/use-location-context'
import { useMapLibraries } from '@/hooks/use-map-libraries'
import type { NaverBounds } from '@/hooks/use-naver-map'

interface Library {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  distanceKm?: number
}

interface Props {
  fallbackLibraries: Library[]
}

const STORAGE_KEY = 'nearbook:geo-permission'
type Status = 'idle' | 'requesting' | 'granted' | 'denied' | 'fallback'

export function LibrariesNearMe({ fallbackLibraries }: Props) {
  const { location, isLoaded: isLocationLoaded, requestGps } = useLocationContext()
  const [status, setStatus] = useState<Status>('idle')
  const [bounds, setBounds] = useState<NaverBounds | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [centerLibraries, setCenterLibraries] = useState<Library[]>([])
  
  // 1. 실시간 지도 영역(Bounds) 기반 데이터
  const { libraries: mapLibraries, isLoading: isMapLoading } = useMapLibraries(bounds)

  // 2. 초기 로딩 시 혹은 위치 변경 시 센터(좌표) 기반 데이터 페칭
  const fetchByCenter = useCallback(async (lat: number, lng: number) => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
      const res = await fetch(`${API_BASE}/libraries/near?lat=${lat}&lng=${lng}&limit=12`)
      const json = await res.json()
      setCenterLibraries(Array.isArray(json) ? json : (json.data ?? []))
    } catch (e) {
      console.error('Center fetch failed', e)
    }
  }, [])

  useEffect(() => {
    if (isLocationLoaded) {
      fetchByCenter(location.lat, location.lng)
    }
  }, [location.lat, location.lng, isLocationLoaded, fetchByCenter])

  // 우선순위: 지도 데이터 > 센터 데이터 > 서버 폴백 데이터
  const displayLibraries = useMemo(() => {
    if (mapLibraries.length > 0) return mapLibraries
    if (centerLibraries.length > 0) return centerLibraries
    return fallbackLibraries
  }, [mapLibraries, centerLibraries, fallbackLibraries])

  const handleBoundsChange = useCallback((newBounds: NaverBounds) => {
    setBounds(newBounds)
  }, [])

  // 초기 상태 동기화
  useEffect(() => {
    if (isLocationLoaded) {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (location.mode === 'gps') {
        setStatus('granted')
      } else if (cached === 'denied') {
        setStatus('denied')
      }
    }
  }, [location.mode, isLocationLoaded])

  const handleRequestLocation = async () => {
    setStatus('requesting')
    try {
      await requestGps()
      localStorage.setItem(STORAGE_KEY, 'granted')
      setStatus('granted')
    } catch (err) {
      console.warn('Location request failed', err)
      localStorage.setItem(STORAGE_KEY, 'denied')
      setStatus('denied')
    }
  }

  const useFallback = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'fallback')
    setStatus('fallback')
  }, [])

  const mapData = useMemo(() => 
    displayLibraries
      .filter(lib => lib.lat && lib.lng) // 좌표가 있는 것만 마커 표시
      .map(lib => ({
        id: lib.id,
        name: lib.name,
        lat: lib.lat,
        lng: lib.lng,
      })), [displayLibraries]
  )

  // 지도의 중심점을 메모이제이션하여 위치가 실제로 바뀔 때만 지도가 이동하게 함 (버그 수정)
  const regionCenter = useMemo(() => ({
    lat: location.lat,
    lng: location.lng,
    zoom: 14
  }), [location.lat, location.lng])

  return (
    <section className="px-4 py-12 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1">
            <MapPin className="w-5 h-5 text-red-500" fill="currentColor" />
            내 주변 도서관
          </h2>
          {isLocationLoaded && (
            <p className="mt-2 text-sm text-gray-500">
              현재 위치: <span className="font-medium text-gray-700">
                {location.label}
              </span>
            </p>
          )}
        </div>
        <Link 
          href="/libraries" 
          className="text-sm font-medium text-gray-500 hover:text-primary-600 flex items-center gap-0.5 transition-colors"
        >
          전체 도서관 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 권한 요청 안내 */}
      {status === 'idle' && !isLocationLoaded && (
        <div className="bg-primary-50 rounded-2xl p-8 text-center border border-primary-100 mb-8">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Navigation className="w-6 h-6 text-primary-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">가까운 도서관을 찾을까요?</h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">위치 권한을 허용하시면 현재 계신 곳에서 가장 가까운 도서관을 거리순으로 보여드려요.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRequestLocation}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition"
            >
              위치 권한 허용
            </button>
            <button
              onClick={useFallback}
              className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition"
            >
              위치 없이 계속하기
            </button>
          </div>
        </div>
      )}

      {/* 메인 스플릿 뷰 (지도 + 리스트) */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-6">
        {/* 지도 영역 */}
        <div className="h-[360px] md:h-[480px] rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative bg-gray-50">
          <NaverInteractiveMap
            libraries={mapData}
            selectedLibraryId={selectedId}
            onMarkerClick={setSelectedId}
            onBoundsChange={handleBoundsChange}
            regionCenter={regionCenter}
            className="w-full h-full"
          />
          {(isMapLoading || (isLocationLoaded && centerLibraries.length === 0 && displayLibraries === fallbackLibraries)) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-primary-500 animate-spin" />
                <span className="text-xs font-medium text-gray-600">불러오는 중...</span>
              </div>
            </div>
          )}
        </div>

        {/* 리스트 영역 */}
        <div className="flex flex-col h-[400px] md:h-[480px]">
          <div className="overflow-y-auto pr-1 space-y-3 scrollbar-hide">
            {displayLibraries.map((lib) => (
              <Link
                key={lib.id}
                href={`/library/${lib.id}`}
                onMouseEnter={() => setSelectedId(lib.id)}
                onMouseLeave={() => setSelectedId(null)}
                className={cn(
                  "block p-4 rounded-xl bg-white border transition-all group",
                  selectedId === lib.id 
                    ? "border-primary-500 shadow-sm ring-1 ring-primary-500/10" 
                    : "border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                      {lib.name}
                    </h4>
                    <p className="mt-1 text-xs text-gray-500 truncate">{lib.address}</p>
                  </div>
                  {/* 거리 정보 (위치 기반 데이터일 때만 표시) */}
                  <div className="ml-3 shrink-0 px-2 py-0.5 rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">
                    {(lib as any).distanceKm ? `${(lib as any).distanceKm.toFixed(1)}km` : (lib as any).distance_m ? `${((lib as any).distance_m / 1000).toFixed(1)}km` : '0.5km'}
                  </div>
                </div>
              </Link>
            ))}

            {!isMapLoading && displayLibraries.length === 0 && (
              <div className="py-20 text-center border border-dashed border-gray-200 rounded-2xl">
                <p className="text-sm text-gray-500">현재 지도 영역에 도서관이 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">지도를 이동해보세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
