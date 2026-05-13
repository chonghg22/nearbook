'use client'

import { useEffect, useState, useCallback } from 'react'
import { LibraryCard } from '@/components/library/library-card'
import { useLocationContext } from '@/lib/use-location-context'
import { LocationBar } from '@/components/location-bar'
import { LocationModal } from '@/components/location-modal'
import type { Status } from '@/components/ui/status-badge'
import { Loader2, Search, MapPin, Heart } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface Props {
  isbn: string
  initialLibraries: any[]
}

type SearchMode = 'nearby' | 'region' | 'favorite'

export function LibraryStatus({ isbn, initialLibraries }: Props) {
  const { location, isLoaded } = useLocationContext()
  const [libraries, setLibraries] = useState(initialLibraries)
  const [isLoading, setIsLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>('nearby')
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  const fetchLibraries = useCallback(async (mode: SearchMode, region?: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (mode === 'nearby') {
        params.set('lat', String(location.lat))
        params.set('lng', String(location.lng))
        params.set('radius', '5')
      } else if (mode === 'region' && region) {
        params.set('region', region)
      }
      
      // apiFetch automatically handles authentication headers if logged in
      const res = await apiFetch(`/books/${isbn}/with-libraries?${params.toString()}`)
      const data = await res.json()
      setLibraries(data.libraries || [])
      setSearchMode(mode)
    } catch (err) {
      console.error('Failed to fetch libraries:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isbn, location.lat, location.lng])

  useEffect(() => {
    if (!isLoaded) return
    // 초기 로딩 시 주변 도서관 검색 (서울 시청 기본 위치가 아닐 때만)
    const isDefaultLocation = Math.abs(location.lat - 37.5665) < 0.001 && Math.abs(location.lng - 126.978) < 0.001
    if (!isDefaultLocation) {
      fetchLibraries('nearby')
    }
  }, [isLoaded, fetchLibraries, location.lat, location.lng])

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region)
    fetchLibraries('region', region)
    setIsLocationModalOpen(false)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          📚 도서관 소장 및 대출 현황
        </h2>
        
        <div className="flex bg-canvas-subtle p-1 rounded-lg border border-border shrink-0">
          <button
            onClick={() => fetchLibraries('nearby')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              searchMode === 'nearby' ? "bg-white shadow-sm text-primary shadow-primary/5" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            내 주변
          </button>
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              searchMode === 'region' ? "bg-white shadow-sm text-primary shadow-primary/5" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="w-3.5 h-3.5" />
            지역 선택
          </button>
          <button
            onClick={() => fetchLibraries('favorite')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              searchMode === 'favorite' ? "bg-white shadow-sm text-primary shadow-primary/5" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart className="w-3.5 h-3.5" />
            즐겨찾기
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 py-2 border-y border-border/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {searchMode === 'nearby' && (
            <>
              <MapPin className="w-4 h-4 text-primary" />
              <span>현재 위치 반경 5km</span>
            </>
          )}
          {searchMode === 'region' && selectedRegion && (
            <>
              <Search className="w-4 h-4 text-primary" />
              <span>{selectedRegion} 지역 도서관</span>
            </>
          )}
          {searchMode === 'favorite' && (
            <>
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>내 도서관 카드</span>
            </>
          )}
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>

      {libraries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {libraries.map((lib: any) => {
            const status: Status = lib.loanAvailable ? 'available' : 'borrowed'
            return (
              <LibraryCard
                key={String(lib.id)}
                libraryId={String(lib.id)}
                libraryName={String(lib.name ?? lib.libraryName ?? '')}
                distanceKm={lib.distanceKm}
                availableCount={lib.loanAvailable ? 1 : 0}
                status={status}
                directionsUrl={`https://map.naver.com/v5/search/${encodeURIComponent(lib.name || lib.libraryName)}`}
              />
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-border border-dashed rounded-xl p-16 text-center shadow-sm">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-foreground font-medium">소장 도서관을 찾지 못했습니다.</p>
          <p className="text-muted-foreground text-sm mt-1">다른 지역이나 검색 모드를 선택해 보세요.</p>
        </div>
      )}

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelect={handleRegionSelect}
      />
    </section>
  )
}
