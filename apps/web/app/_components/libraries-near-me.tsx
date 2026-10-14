'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapPin, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { NaverInteractiveMap } from '@/components/maps/naver-interactive-map'
import { useLocationContext } from '@/lib/use-location-context'
import { LocationBar } from '@/components/location-bar'
import { publicApiJson } from '@/lib/public-api-client'
import {
  nearbyLibrariesPath,
  parseHomeLibraries,
  formatReferenceDistance,
} from '@/lib/home-libraries'

const fetcher = (path: string) => publicApiJson(path, parseHomeLibraries)
const ignoreBoundsChange = () => {} // Home lists follow the chosen reference, not a viewport pan.

export function LibrariesNearMe() {
  const { location, isLoaded } = useLocationContext()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const path = nearbyLibrariesPath(location)
  const { data, error, isLoading, isValidating, mutate } = useSWR(isLoaded ? path : null, fetcher, {
    keepPreviousData: false,
    shouldRetryOnError: false,
  })
  useEffect(() => {
    setSelectedId(null)
  }, [path])
  const libraries = error ? [] : (data ?? [])
  const loading = !isLoaded || isLoading || isValidating
  const regionCenter = useMemo(
    () => ({ lat: location.lat, lng: location.lng, zoom: 14 }),
    [location.lat, location.lng]
  )

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <MapPin className="h-5 w-5 text-primary" aria-hidden="true" /> 기준 위치 주변 도서관
        </h2>
        <Link
          href="/libraries"
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-primary-600"
        >
          전체 도서관 <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <LocationBar showDescription />
      <p className="mb-5 mt-3 text-xs leading-5 text-gray-500">
        기준 좌표 반경 5km 안의 가까운 도서관을 최대 12곳 표시합니다. 지도를 움직여도 기준 위치는
        바뀌지 않습니다.
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_400px]">
        <div className="relative h-[360px] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm md:h-[480px]">
          <NaverInteractiveMap
            libraries={libraries}
            scopeKey={path}
            selectedLibraryId={selectedId}
            onMarkerClick={setSelectedId}
            onBoundsChange={ignoreBoundsChange}
            regionCenter={regionCenter}
            className="h-full w-full"
          />
        </div>
        <div className="h-[400px] overflow-y-auto pr-1 md:h-[480px]">
          {loading ? (
            <p role="status" className="py-8 text-center text-sm text-gray-500">
              선택한 기준 위치 주변 도서관을 불러오는 중...
            </p>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-red-100 p-6 text-center text-sm">
              <p className="text-red-600">
                도서관 목록을 불러오지 못했습니다. 주변에 도서관이 없다는 뜻은 아닙니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  void mutate()
                }}
                className="mt-3 rounded-full border px-4 py-2 text-primary"
              >
                다시 시도
              </button>
            </div>
          ) : libraries.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
              <p>기준 좌표 반경 5km 안에 등록된 도서관이 없습니다.</p>
              <p className="mt-2">지역·도서관 변경으로 다른 기준을 선택해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {libraries.map((lib) => {
                const distance = formatReferenceDistance(lib.distanceKm)
                return (
                  <Link
                    key={lib.id}
                    href={`/library/${lib.id}`}
                    onMouseEnter={() => setSelectedId(lib.id)}
                    onMouseLeave={() => setSelectedId(null)}
                    onFocus={() => setSelectedId(lib.id)}
                    onBlur={() => setSelectedId(null)}
                    className={cn(
                      'group block rounded-xl border bg-white p-4 shadow-sm transition-all',
                      selectedId === lib.id
                        ? 'border-primary-500 ring-1 ring-primary-500/10'
                        : 'border-gray-100 hover:border-primary-200'
                    )}
                  >
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-600">
                      {lib.name}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{lib.address}</p>
                    {distance && (
                      <p className="mt-2 text-xs font-semibold text-primary">{distance}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
