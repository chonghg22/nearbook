'use client'
import { useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getStaticMapUrl } from '@/lib/maps'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

interface LibraryMarker {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  distanceKm?: number
}

interface LibraryMapProps {
  initialLat?: number
  initialLng?: number
  initialZoom?: number
  regionFilter?: string
}

export function LibraryMap({
  initialLat = 37.5665,
  initialLng = 126.9780,
  regionFilter,
}: LibraryMapProps) {
  const [libraries, setLibraries] = useState<LibraryMarker[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLibraries = useCallback(async (lat: number, lng: number, region?: string) => {
    setLoading(true)
    try {
      let url: string
      if (region) {
        url = `${API_BASE}/libraries?region=${encodeURIComponent(region)}&limit=50`
      } else {
        url = `${API_BASE}/libraries/near?lat=${lat}&lng=${lng}&radius=5`
      }
      const res = await fetch(url)
      if (!res.ok) {
        console.warn('[LibraryMap] API 응답 에러:', res.status)
        return []
      }
      const json = await res.json()
      return Array.isArray(json) ? json : json.data ?? []
    } catch (e) {
      console.error('[LibraryMap] fetch error', e)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const lat = regionFilter ? 0 : initialLat
    const lng = regionFilter ? 0 : initialLng
    fetchLibraries(lat, lng, regionFilter).then(setLibraries)
  }, [initialLat, initialLng, regionFilter, fetchLibraries])

  const centerLat = libraries.length > 0 ? libraries[0].lat : initialLat
  const centerLng = libraries.length > 0 ? libraries[0].lng : initialLng
  const mapUrl = getStaticMapUrl(centerLat, centerLng, { w: 800, h: 480, level: 13 })

  return (
    <div className="relative w-full">
      <div className="w-full rounded-xl overflow-hidden border border-gray-200">
        <Image
          src={mapUrl}
          alt="도서관 위치 지도"
          width={800}
          height={480}
          className="w-full"
          unoptimized
        />
      </div>

      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-1.5 rounded-full text-sm text-gray-600 shadow-md border border-gray-100 z-10">
          🔍 도서관 검색 중…
        </div>
      )}

      {!loading && libraries.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-500">📍 {libraries.length}개 도서관</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {libraries.slice(0, 10).map((lib) => (
              <li key={lib.id}>
                <Link
                  href={`/library/${lib.id}`}
                  className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  <p className="font-medium text-sm">{lib.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{lib.address}</p>
                  {lib.distanceKm != null && (
                    <p className="text-xs text-blue-600 mt-0.5">{lib.distanceKm.toFixed(1)}km</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
