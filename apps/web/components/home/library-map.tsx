'use client'
import { useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getStaticMapUrl } from '@/lib/maps'
import { cn } from '@/lib/utils'
import { PUBLIC_API_BASE_URL } from '@/lib/constants'

const API_BASE = PUBLIC_API_BASE_URL

interface LibraryMarker {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  distanceKm?: number
}

interface LibraryMapProps {
  initialLat?: number | undefined
  initialLng?: number | undefined
  initialZoom?: number | undefined
  regionFilter?: string | undefined
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

  const centerLat = libraries.length > 0 ? (libraries[0]?.lat ?? initialLat) : initialLat
  const centerLng = libraries.length > 0 ? (libraries[0]?.lng ?? initialLng) : initialLng
  const mapUrl = getStaticMapUrl(centerLat, centerLng, { w: 800, h: 480, level: 13 })

  return (
    <div className="relative w-full">
      <div className="w-full rounded-2xl overflow-hidden border border-border shadow-card bg-white p-1">
        <div className="relative aspect-[16/10] sm:aspect-[21/9] rounded-xl overflow-hidden grayscale-[0.3] contrast-[1.1]">
          <Image
            src={mapUrl}
            alt="도서관 위치 지도"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </div>

      {loading && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-semibold text-primary shadow-card-md border border-primary/20 z-10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          도서관 검색 중…
        </div>
      )}

      {!loading && libraries.length > 0 && (
        <div className="mt-8 space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            📍 근처 {libraries.length}개 도서관
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {libraries.slice(0, 10).map((lib) => (
              <li key={lib.id}>
                <Link
                  href={`/library/${lib.id}`}
                  className="block p-4 rounded-xl bg-white border border-border hover:border-primary/50 hover:shadow-card-hover transition-all duration-300 group"
                >
                  <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{lib.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{lib.address}</p>
                  {lib.distanceKm != null && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/5 rounded-full">
                        {lib.distanceKm.toFixed(1)}km
                      </span>
                      <span className="text-[10px] text-subtle-foreground">상세보기 →</span>
                    </div>
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
