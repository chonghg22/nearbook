'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Locate, Map, Building2, Search, Loader2 } from 'lucide-react'
import useSWR from 'swr'
import { useLocationContext } from '@/lib/use-location-context'
import { REGION_TREE, REGION_COORDS } from '@/lib/region-coords'
import { PUBLIC_API_BASE_URL } from '@/lib/constants'

type Tab = 'gps' | 'region' | 'library'

const API_BASE = PUBLIC_API_BASE_URL
const fetcher = (url: string) => fetch(url).then(r => r.json())

interface LibrarySearchResult {
  id: number
  name: string
  address: string
  region: string
  lat: number
  lng: number
}

export function LocationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { location, requestGps, selectRegion, selectLibrary } = useLocationContext()
  const [activeTab, setActiveTab] = useState<Tab>('gps')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [selectedSido, setSelectedSido] = useState<string | null>(null)
  const [libraryQuery, setLibraryQuery] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  // 현재 모드에 맞는 탭 초기화
  useEffect(() => {
    if (isOpen) {
      setActiveTab(location.mode === 'library' ? 'library'
        : location.mode === 'gps' ? 'gps' : 'region')
      setGpsError(null)
    }
  }, [isOpen, location.mode])

  // 도서관 검색 (2글자 이상일 때만 호출)
  const { data: libraryResults, isLoading: libLoading } = useSWR<{ data: LibrarySearchResult[] }>(
    libraryQuery.length >= 2
      ? `${API_BASE}/libraries?q=${encodeURIComponent(libraryQuery)}&limit=10`
      : null,
    fetcher,
  )

  // ESC 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!isOpen) return null

  async function handleGpsClick() {
    setGpsLoading(true)
    setGpsError(null)
    try {
      await requestGps()
      onClose()
    } catch {
      setGpsError('위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.')
    } finally {
      setGpsLoading(false)
    }
  }

  function handleRegionSelect(slug: string) {
    selectRegion(slug)
    onClose()
  }

  function handleLibrarySelect(lib: LibrarySearchResult) {
    selectLibrary(lib)
    onClose()
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'gps', label: '현재 위치', icon: <Locate className="w-4 h-4" /> },
    { key: 'region', label: '지역 선택', icon: <Map className="w-4 h-4" /> },
    { key: 'library', label: '도서관 선택', icon: <Building2 className="w-4 h-4" /> },
  ]

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-900">어느 지역 도서관을 볼까요?</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors
                ${activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Tab 1: GPS */}
          {activeTab === 'gps' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center">
                <Locate className="w-8 h-8 text-primary-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">현재 위치 사용</p>
                <p className="text-sm text-gray-500 mt-1">GPS로 가장 가까운 도서관을 자동으로 찾아드립니다</p>
              </div>
              {gpsError && (
                <p className="text-sm text-red-600 text-center bg-red-50 rounded-lg px-4 py-2">{gpsError}</p>
              )}
              <button
                onClick={handleGpsClick}
                disabled={gpsLoading}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-60 transition-colors"
              >
                {gpsLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> 위치 확인 중...</>
                  : <><Locate className="w-4 h-4" /> 내 위치로 검색</>
                }
              </button>
            </div>
          )}

          {/* Tab 2: 지역 선택 */}
          {activeTab === 'region' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">시·도 선택</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {REGION_TREE.map(sido => (
                    <button
                      key={sido.label}
                      onClick={() => setSelectedSido(sido.label === selectedSido ? null : sido.label)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                        ${selectedSido === sido.label
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
                        }`}
                    >
                      {sido.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedSido && (() => {
                const sido = REGION_TREE.find(s => s.label === selectedSido)
                if (!sido) return null
                return (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">구·시 선택</label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {sido.children.map(slug => {
                        const coord = REGION_COORDS[slug]
                        if (!coord) return null
                        return (
                          <button
                            key={slug}
                            onClick={() => handleRegionSelect(slug)}
                            className="px-3 py-1.5 rounded-full text-sm border bg-white text-gray-700 border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                          >
                            {coord.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {!selectedSido && (
                <p className="text-sm text-gray-400 text-center py-4">시·도를 먼저 선택하세요</p>
              )}
            </div>
          )}

          {/* Tab 3: 도서관 직접 선택 */}
          {activeTab === 'library' && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="도서관 이름으로 검색 (예: 강남, 마포)"
                  value={libraryQuery}
                  onChange={e => setLibraryQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {libLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              )}

              {libraryResults?.data?.length === 0 && libraryQuery.length >= 2 && !libLoading && (
                <p className="text-sm text-gray-400 text-center py-4">&ldquo;{libraryQuery}&rdquo;에 해당하는 도서관이 없어요</p>
              )}

              {libraryResults?.data && libraryResults.data.length > 0 && (
                <ul className="divide-y divide-gray-100">
                  {libraryResults.data.map(lib => (
                    <li key={lib.id}>
                      <button
                        onClick={() => handleLibrarySelect(lib)}
                        className="w-full text-left px-2 py-3 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <p className="font-medium text-gray-900 text-sm">{lib.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{lib.address}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {libraryQuery.length < 2 && (
                <p className="text-sm text-gray-400 text-center py-4">두 글자 이상 입력하면 검색됩니다</p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
