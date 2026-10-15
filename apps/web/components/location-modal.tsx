'use client'
import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { X, Locate, Map, Building2, Search, Loader2 } from 'lucide-react'
import useSWR from 'swr'
import { useLocationContext } from '@/lib/use-location-context'
import { REGION_TREE, REGION_COORDS } from '@/lib/region-coords'
import { publicApiJson } from '@/lib/public-api-client'
import { parseLibrarySearch } from '@/lib/api-contracts'
import * as Dialog from '@radix-ui/react-dialog'
import { gpsErrorMessage } from '@/lib/location-gps'
import { locationDescription } from '@/lib/location-state'
import { useVisualViewportHeight } from '@/lib/use-visual-viewport-height'

type Tab = 'gps' | 'region' | 'library'

const fetcher = (path: string) => publicApiJson(path, parseLibrarySearch)

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
  returnFocusRef,
}: {
  isOpen: boolean
  onClose: () => void
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>
}) {
  const { location, requestGps, selectRegion, selectLibrary } = useLocationContext()
  const [activeTab, setActiveTab] = useState<Tab>('region')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [selectedSido, setSelectedSido] = useState<string | null>(null)
  const [libraryQuery, setLibraryQuery] = useState('')
  const gpsRequestRef = useRef<AbortController | null>(null)
  const viewport = useVisualViewportHeight(isOpen)

  // 현재 모드에 맞는 탭 초기화
  useEffect(() => {
    if (isOpen) {
      setActiveTab(
        location.mode === 'library' ? 'library' : location.mode === 'gps' ? 'gps' : 'region'
      )
      setGpsError(null)
      setGpsLoading(false)
      setLibraryQuery('')
      setSelectedSido(
        location.mode === 'region'
          ? (REGION_TREE.find((sido) => sido.children.includes(location.regionSlug))?.label ?? null)
          : null
      )
    }
    return () => {
      gpsRequestRef.current?.abort()
    }
  }, [isOpen, location])

  // 도서관 검색 (2글자 이상일 때만 호출)
  const {
    data: libraryResults,
    error: libError,
    isLoading: libLoading,
  } = useSWR<{ data: LibrarySearchResult[] }>(
    isOpen && activeTab === 'library' && libraryQuery.trim().length >= 2
      ? `/libraries?q=${encodeURIComponent(libraryQuery.trim())}&limit=10`
      : null,
    fetcher,
    { shouldRetryOnError: false }
  )

  if (!isOpen) return null

  function chooseTab(tab: Tab) {
    if (tab !== 'gps') {
      gpsRequestRef.current?.abort()
      setGpsLoading(false)
    }
    setActiveTab(tab)
  }
  async function handleGpsClick() {
    gpsRequestRef.current?.abort()
    const controller = new AbortController()
    gpsRequestRef.current = controller
    setGpsLoading(true)
    setGpsError(null)
    try {
      await requestGps(controller.signal)
      if (!controller.signal.aborted) onClose()
    } catch (error) {
      if (!controller.signal.aborted) setGpsError(gpsErrorMessage(error))
    } finally {
      if (gpsRequestRef.current === controller) setGpsLoading(false)
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
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          style={{ maxHeight: viewport?.height, '--visual-viewport-bottom': `${viewport?.bottom ?? 0}px` } as CSSProperties}
          onCloseAutoFocus={(event) => {
            if (returnFocusRef?.current) {
              event.preventDefault()
              returnFocusRef.current.focus()
            }
          }}
          className="fixed inset-x-0 bottom-[var(--visual-viewport-bottom,0px)] z-50 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <Dialog.Title className="font-semibold text-gray-900">
              어느 지역 도서관을 볼까요?
            </Dialog.Title>
            <Dialog.Close
              aria-label="기준 위치 선택 닫기"
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="px-4 py-3 text-xs leading-5 text-gray-500">
            {locationDescription(location).title}: {location.label}. GPS는 선택 사항입니다. 지역이나
            도서관을 직접 선택해도 됩니다.
          </Dialog.Description>

          {/* 탭 */}
          <div className="flex border-b" role="group" aria-label="기준 위치 선택 방법">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={activeTab === tab.key}
                onClick={() => chooseTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors
                ${
                  activeTab === tab.key
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {/* Tab 1: GPS */}
            {activeTab === 'gps' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center">
                  <Locate className="w-8 h-8 text-primary-500" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-900">현재 위치 사용</p>
                  <p className="text-sm text-gray-500 mt-1">
                    GPS로 가장 가까운 도서관을 자동으로 찾아드립니다
                  </p>
                </div>
                {gpsError && (
                  <p
                    role="alert"
                    className="text-sm text-red-600 text-center bg-red-50 rounded-lg px-4 py-2"
                  >
                    {gpsError}
                  </p>
                )}
                <button
                  onClick={handleGpsClick}
                  disabled={gpsLoading}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-60 transition-colors"
                >
                  {gpsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> 위치 확인 중...
                    </>
                  ) : (
                    <>
                      <Locate className="w-4 h-4" /> 내 위치로 검색
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => chooseTab('region')}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-primary hover:bg-primary-50"
                >
                  GPS 없이 지역 직접 선택
                </button>
              </div>
            )}

            {/* Tab 2: 지역 선택 */}
            {activeTab === 'region' && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    시·도 선택
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {REGION_TREE.map((sido) => (
                      <button
                        key={sido.label}
                        type="button"
                        aria-pressed={selectedSido === sido.label}
                        onClick={() =>
                          setSelectedSido(sido.label === selectedSido ? null : sido.label)
                        }
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                        ${
                          selectedSido === sido.label
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        {sido.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedSido &&
                  (() => {
                    const sido = REGION_TREE.find((s) => s.label === selectedSido)
                    if (!sido) return null
                    return (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          기준 지역 선택 (중심 좌표 주변)
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {sido.children.map((slug) => {
                            const coord = REGION_COORDS[slug]
                            if (!coord) return null
                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => handleRegionSelect(slug)}
                                className="px-3 py-1.5 rounded-full text-sm border bg-white text-gray-700 border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                              >
                                {coord.label.replace(' 전체', ' 중심')}
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
                {libError && (
                  <p role="alert" className="text-sm text-red-600">
                    도서관 검색을 불러오지 못했습니다. 검색 결과가 없다는 뜻은 아닙니다.
                  </p>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="도서관 이름으로 검색 (예: 강남, 마포)"
                    aria-label="기준 도서관 이름 검색"
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {libLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                )}

                {!libError &&
                  libraryResults?.data?.length === 0 &&
                  libraryQuery.trim().length >= 2 &&
                  !libLoading && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      &ldquo;{libraryQuery}&rdquo;에 해당하는 도서관이 없어요
                    </p>
                  )}

                {!libError &&
                  libraryQuery.trim().length >= 2 &&
                  libraryResults?.data &&
                  libraryResults.data.length > 0 && (
                    <ul className="divide-y divide-gray-100">
                      {libraryResults.data.map((lib) => (
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

                {libraryQuery.trim().length < 2 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    두 글자 이상 입력하면 검색됩니다
                  </p>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
