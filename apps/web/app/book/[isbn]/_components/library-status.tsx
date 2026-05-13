'use client'

import { useEffect, useState } from 'react'
import { LibraryCard } from '@/components/library/library-card'
import { useLocationContext } from '@/lib/use-location-context'
import { LocationBar } from '@/components/location-bar'
import type { Status } from '@/components/ui/status-badge'
import { Loader2 } from 'lucide-react'

interface Props {
  isbn: string
  initialLibraries: any[]
}

export function LibraryStatus({ isbn, initialLibraries }: Props) {
  const { location, isLoaded } = useLocationContext()
  const [libraries, setLibraries] = useState(initialLibraries)
  const [isLoading, setIsLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (!isLoaded) return

    // 사용자 위치가 서울 시청(기본값)과 같고 아직 한번도 fetch하지 않았으면 초기 데이터 사용
    const isDefaultLocation = Math.abs(location.lat - 37.5665) < 0.001 && Math.abs(location.lng - 126.978) < 0.001
    if (isDefaultLocation && !hasFetched) return

    const fetchNearby = async () => {
      setIsLoading(true)
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
        const res = await fetch(`${API_BASE}/books/${isbn}/with-libraries?lat=${location.lat}&lng=${location.lng}`)
        const data = await res.json()
        setLibraries(data.libraries || [])
      } catch (err) {
        console.error('Failed to fetch nearby libraries:', err)
      } finally {
        setIsLoading(false)
        setHasFetched(true)
      }
    }
    fetchNearby()
  }, [isbn, location.lat, location.lng, isLoaded])

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          📚 주변 도서관 보유 현황
        </h2>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="mb-4">
        <LocationBar />
      </div>

      {libraries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {libraries.map((lib: any) => {
            const status: Status = lib.loanAvailable ? 'available' : 'borrowed'
            return (
              <LibraryCard
                key={String(lib.id)}
                libraryId={String(lib.id)}
                libraryName={String(lib.name ?? '')}
                distanceKm={lib.distanceKm}
                availableCount={lib.loanAvailable ? 1 : 0}
                status={status}
              />
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-border border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground">반경 5km 내 도서관 정보가 없습니다.</p>
        </div>
      )}
    </section>
  )
}
