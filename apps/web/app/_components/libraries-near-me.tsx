'use client'

import { useEffect, useState } from 'react'
import { MapPin, Navigation, Info } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Library {
  id: number
  name: string
  address: string
  distanceKm?: number
}

interface Props {
  fallbackLibraries: Library[]
}

const STORAGE_KEY = 'nearbook:geo-permission'
type Status = 'idle' | 'requesting' | 'granted' | 'denied' | 'fallback'

export function LibrariesNearMe({ fallbackLibraries }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [libraries, setLibraries] = useState<Library[]>(fallbackLibraries)

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached === 'granted') {
      requestLocation()
    } else if (cached === 'denied') {
      setStatus('denied')
    } else if (cached === 'fallback') {
      setStatus('fallback')
    }
  }, [])

  function requestLocation() {
    if (!navigator.geolocation) {
      setStatus('denied')
      return
    }
    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        localStorage.setItem(STORAGE_KEY, 'granted')
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/libraries/near?lat=${lat}&lng=${lng}&limit=8`)
          const json = await res.json()
          setLibraries(json.data ?? json ?? [])
          setStatus('granted')
        } catch (error) {
          console.error('Failed to fetch nearby libraries', error)
          setStatus('fallback')
        }
      },
      (error) => {
        console.warn('Geolocation error', error)
        localStorage.setItem(STORAGE_KEY, 'denied')
        setStatus('denied')
      },
      { timeout: 10000 }
    )
  }

  function useFallback() {
    localStorage.setItem(STORAGE_KEY, 'fallback')
    setStatus('fallback')
  }

  return (
    <section className="px-4 py-12 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary-500" />
            내 주변 도서관
          </h2>
          <p className="mt-1 text-sm text-gray-500">가까운 도서관을 찾아보세요.</p>
        </div>
        {status === 'granted' && (
          <button 
            onClick={requestLocation}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <Navigation className="w-3 h-3" />
            위치 갱신
          </button>
        )}
      </div>

      {(status === 'idle' || status === 'requesting') && (
        <div className="bg-primary-50 rounded-2xl p-8 text-center border border-primary-100 mb-8">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Navigation className={cn("w-6 h-6 text-primary-600", status === 'requesting' && "animate-spin")} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">가까운 도서관을 찾을까요?</h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">위치 권한을 허용하시면 현재 계신 곳에서 가장 가까운 도서관을 거리순으로 보여드려요.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={requestLocation}
              disabled={status === 'requesting'}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition disabled:opacity-50"
            >
              위치 권한 허용
            </button>
            <button
              onClick={useFallback}
              className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition"
            >
              위치 없이 인기 도서관 보기
            </button>
          </div>
        </div>
      )}

      {status === 'denied' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 mb-8">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">위치 권한이 차단되어 있습니다.</p>
            <p className="mt-0.5">가까운 도서관을 보려면 브라우저 설정에서 위치 권한을 허용한 후 페이지를 새로고침 해주세요.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {libraries.map((lib) => (
          <Link
            key={lib.id}
            href={`/library/${lib.id}`}
            className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group"
          >
            <h4 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
              {lib.name}
            </h4>
            <p className="mt-1 text-sm text-gray-500 line-clamp-1">{lib.address}</p>
            {lib.distanceKm !== undefined && (
              <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-600">
                <Navigation className="w-2.5 h-2.5" />
                {lib.distanceKm}km
              </div>
            )}
          </Link>
        ))}
      </div>
      
      {libraries.length === 0 && status === 'granted' && (
        <div className="py-20 text-center">
          <p className="text-gray-500">반경 5km 이내에 도서관이 없습니다.</p>
        </div>
      )}
    </section>
  )
}
