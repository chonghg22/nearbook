'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useMapLibraries } from '@/hooks/use-map-libraries'
import { NaverInteractiveMap } from '@/components/maps/naver-interactive-map'
import type { NaverBounds } from '@/hooks/use-naver-map'
import { resolveRegionCenter } from '@/lib/map-libraries.mjs'

// 시도 → 시군구 매핑
const REGION_MAP: Record<string, string[]> = {
  '서울특별시': ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'],
  '부산광역시': ['강서구','금정구','기장군','남구','동구','동래구','부산진구','북구','사상구','사하구','서구','수영구','연제구','영도구','중구','해운대구'],
  '대구광역시': ['군위군','남구','달서구','달성군','동구','북구','서구','수성구','중구'],
  '인천광역시': ['강화군','계양구','미추홀구','남동구','동구','부평구','서구','연수구','옹진군','중구'],
  '광주광역시': ['광산구','남구','동구','북구','서구'],
  '대전광역시': ['대덕구','동구','서구','유성구','중구'],
  '울산광역시': ['남구','동구','북구','울주군','중구'],
  '세종특별자치시': [],
  '경기도': ['가평군','고양시','과천시','광명시','광주시','구리시','군포시','김포시','남양주시','동두천시','부천시','성남시','수원시','시흥시','안산시','안성시','안양시','양주시','양평군','여주시','연천군','오산시','용인시','의왕시','의정부시','이천시','파주시','평택시','포천시','하남시','화성시'],
  '강원특별자치도': ['강릉시','고성군','동해시','삼척시','속초시','양구군','양양군','영월군','원주시','인제군','정선군','철원군','춘천시','태백시','평창군','홍천군','화천군','횡성군'],
  '충청북도': ['괴산군','단양군','보은군','영동군','옥천군','음성군','제천시','증평군','진천군','청주시','충주시'],
  '충청남도': ['계룡시','공주시','금산군','논산시','당진시','보령시','부여군','서산시','서천군','아산시','예산군','천안시','청양군','태안군','홍성군'],
  '전북특별자치도': ['고창군','군산시','김제시','남원시','무주군','부안군','순창군','완주군','익산시','임실군','장수군','전주시','정읍시','진안군'],
  '전라남도': ['강진군','고흥군','곡성군','광양시','구례군','나주시','담양군','목포시','무안군','보성군','순천시','신안군','여수시','영광군','영암군','완도군','장성군','장흥군','진도군','함평군','해남군','화순군'],
  '경상북도': ['경산시','경주시','고령군','구미시','군위군','김천시','문경시','봉화군','상주시','성주군','안동시','영덕군','영양군','영주시','영천시','예천군','울릉군','울진군','의성군','청도군','청송군','칠곡군','포항시'],
  '경상남도': ['거제시','거창군','고성군','김해시','남해군','밀양시','사천시','산청군','양산시','의령군','진주시','창녕군','창원시','통영시','하동군','함안군','함양군','합천군'],
  '제주특별자치도': ['서귀포시','제주시'],
}

const SIDO_LIST = Object.keys(REGION_MAP)

// 시도별 중심 좌표
const SIDO_CENTER: Record<string, { lat: number; lng: number; zoom: number }> = {
  '서울특별시':     { lat: 37.5665, lng: 126.9780, zoom: 12 },
  '부산광역시':     { lat: 35.1796, lng: 129.0756, zoom: 12 },
  '대구광역시':     { lat: 35.8714, lng: 128.6014, zoom: 12 },
  '인천광역시':     { lat: 37.4563, lng: 126.7052, zoom: 12 },
  '광주광역시':     { lat: 35.1595, lng: 126.8526, zoom: 12 },
  '대전광역시':     { lat: 36.3504, lng: 127.3845, zoom: 12 },
  '울산광역시':     { lat: 35.5384, lng: 129.3114, zoom: 12 },
  '세종특별자치시': { lat: 36.4800, lng: 127.2890, zoom: 12 },
  '경기도':         { lat: 37.4138, lng: 127.5183, zoom: 10 },
  '강원특별자치도': { lat: 37.8228, lng: 128.1555, zoom: 10 },
  '충청북도':       { lat: 36.8000, lng: 127.7000, zoom: 10 },
  '충청남도':       { lat: 36.5184, lng: 126.8000, zoom: 10 },
  '전북특별자치도': { lat: 35.7175, lng: 127.1530, zoom: 10 },
  '전라남도':       { lat: 34.8679, lng: 126.9910, zoom: 10 },
  '경상북도':       { lat: 36.4919, lng: 128.8889, zoom: 10 },
  '경상남도':       { lat: 35.4606, lng: 128.2132, zoom: 10 },
  '제주특별자치도': { lat: 33.4890, lng: 126.4983, zoom: 11 },
}

type ViewMode = 'list' | 'map' | 'split'

export function LibrariesMapView() {
  const [sido, setSido] = useState<string>('')
  const [sigungu, setSigungu] = useState<string>('')
  const [bounds, setBounds] = useState<NaverBounds | null>(null)
  const [hoveredLibraryId, setHoveredLibraryId] = useState<number | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  // SSR과 첫 클라이언트 렌더는 항상 분할로 같게 두고, 마운트 후 모바일이면 사용자가 고르지 않은 경우에만 지도로 바꾼다.
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const chooseView = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => {
      if (media.matches) setViewMode((mode) => mode === 'split' ? 'map' : mode)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  // 시군구 목록 (시도 선택 시 동적)
  const sigunguList = sido ? REGION_MAP[sido] ?? [] : []

  // 지역을 선택하면 지도 표시·이동과 무관하게 지역 기준으로 조회한다.
  // '전체 시도'로 돌아왔을 때만 지도 영역(지도가 없으면 서울 기본 영역)을 따른다.
  const region = useMemo(() => (sido ? { sido, sigungu } : undefined), [sido, sigungu])
  const { libraries, scope, isLoading, isEmpty, error, center, limited, retry } = useMapLibraries(bounds, region)

  // 시도 전체는 고정 중심, 시군구는 현재 응답의 중심만 쓴다. 로딩·실패·빈 결과에서는 시도 중심으로 돌아간다.
  const regionCenter = useMemo(
    () => resolveRegionCenter({ sido, sigungu, provinceCenter: SIDO_CENTER[sido], responseCenter: center }),
    [sido, sigungu, center],
  )

  const regionLabel = sigungu ? `${sido} ${sigungu}` : sido
  const loadingMessage = regionLabel ? `${regionLabel} 도서관을 불러오는 중...` : '불러오는 중...'
  const emptyMessage = sido
    ? '선택한 지역에 등록된 도서관이 없습니다'
    : '현재 지도 영역에 도서관이 없습니다. 지도를 이동하거나 지역을 선택해 보세요'
  // 목록이 보이지 않는 지도 단독 보기에서만 데이터 상태를 지도 위에 띄워 분할 보기와 알림이 겹치지 않게 한다.
  const showMapDataState = viewMode === 'map'

  const handleSidoChange = useCallback((value: string) => {
    setSido(value)
    setSigungu('')
  }, [])

  const handleBoundsChange = useCallback((newBounds: NaverBounds) => {
    setBounds(newBounds)
  }, [])

  return (
    <div className="flex min-h-0 flex-col h-[calc(100dvh-64px)]">
      {/* 상단 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-white z-10 flex-shrink-0">
        {/* 지역 필터 */}
        <div className="flex min-w-0 max-w-full flex-wrap gap-2">
          {/* 시도 */}
          <select
            value={sido}
            onChange={(e) => handleSidoChange(e.target.value)}
            aria-label="시도"
            className="border border-gray-300 rounded-lg px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-11 min-w-[120px] max-w-full"
          >
            <option value="">전체 시도</option>
            {SIDO_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* 시군구 — 시도 선택 후 활성화 */}
          <select
            value={sigungu}
            onChange={(e) => setSigungu(e.target.value)}
            disabled={!sido || sigunguList.length === 0}
            aria-label="시군구"
            className="border border-gray-300 rounded-lg px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-11 min-w-[120px] max-w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">전체 시군구</option>
            {sigunguList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 뷰 모드 토글 */}
        <div className="ml-auto flex gap-1" role="group" aria-label="도서관 보기 방식">
          <button
            type="button"
            onClick={() => chooseView('list')}
            aria-pressed={viewMode === 'list'}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            목록
          </button>
          <button
            type="button"
            onClick={() => chooseView('map')}
            aria-pressed={viewMode === 'map'}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'map' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            지도
          </button>
          <button
            type="button"
            onClick={() => chooseView('split')}
            aria-pressed={viewMode === 'split'}
            className={`px-3 py-1 rounded text-sm hidden md:block ${viewMode === 'split' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            분할
          </button>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 목록 패널 */}
        {(viewMode === 'list' || viewMode === 'split') && (
          <div
            className={`min-w-0 overflow-y-auto overscroll-contain ${viewMode === 'split' ? 'w-full md:w-[400px] md:min-w-[320px] md:shrink-0' : 'w-full'} border-r`}
          >
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm" role="status">{loadingMessage}</div>
            ) : error ? (
              <div className="p-4 text-center text-sm" role="alert">
                <p className="text-red-500">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-2 rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50"
                >
                  다시 시도
                </button>
              </div>
            ) : isEmpty ? (
              <div className="p-4 text-center text-gray-400 text-sm">{emptyMessage}</div>
            ) : (
              <>
                {limited && (
                  <p className="p-3 border-b text-xs text-gray-500">
                    최대 200곳까지 표시합니다. 시군구를 선택하면 범위를 좁힐 수 있습니다.
                  </p>
                )}
                {libraries.map((lib) => (
                  <Link
                    key={lib.id}
                    href={`/library/${lib.id}`}
                    className={`block p-3 border-b hover:bg-primary-50 transition-colors ${
                      hoveredLibraryId === lib.id ? 'bg-primary-50' : ''
                    }`}
                    onMouseEnter={() => setHoveredLibraryId(lib.id)}
                    onMouseLeave={() => setHoveredLibraryId(null)}
                  >
                    <p className="font-medium text-sm [overflow-wrap:anywhere]">{lib.name}</p>
                    {lib.address && <p className="text-xs text-gray-500 mt-0.5 [overflow-wrap:anywhere]">{lib.address}</p>}
                  </Link>
                ))}
              </>
            )}
          </div>
        )}

        {/* 지도 패널 */}
        {(viewMode === 'map' || viewMode === 'split') && (
          // min-w-0: SDK가 지도 요소에 쓴 픽셀 너비가 flex 최소 크기가 되어 분할 전환 때 패널이 줄지 못하는 것을 막는다.
          <div className={`relative flex-1 min-w-0 ${viewMode === 'split' ? 'hidden md:block' : ''}`}>
            <NaverInteractiveMap
              onBoundsChange={handleBoundsChange}
              onMapErrorChange={setMapError}
              libraries={libraries}
              scopeKey={scope}
              selectedLibraryId={hoveredLibraryId}
              regionCenter={regionCenter}
              className="h-full"
            />
            {(showMapDataState && (isLoading || error || isEmpty)) || mapError ? (
              // 패널이 페이지 머리말 아래에서 시작해 하단은 첫 화면 밖이므로, 안내와 목록 보기는 상단에 띄운다.
              <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-2 text-sm">
                {showMapDataState && (isLoading ? (
                  <div role="status" className="pointer-events-auto rounded-lg border bg-white/95 p-3 text-gray-600 shadow-sm">
                    {loadingMessage}
                  </div>
                ) : error ? (
                  <div
                    role="alert"
                    className="pointer-events-auto flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-white/95 p-3 shadow-sm"
                  >
                    <span className="text-red-600">{error}</span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={retry}
                        className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-700 hover:bg-gray-50"
                      >
                        다시 시도
                      </button>
                      <button
                        type="button"
                        onClick={() => chooseView('list')}
                        className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-700 hover:bg-gray-50"
                      >
                        목록 보기
                      </button>
                    </span>
                  </div>
                ) : isEmpty ? (
                  <div role="status" className="pointer-events-auto rounded-lg border bg-white/95 p-3 text-gray-500 shadow-sm">
                    {emptyMessage}
                  </div>
                ) : null)}
                {mapError && (
                  <div
                    role="alert"
                    className="pointer-events-auto flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800"
                  >
                    <span>지도를 불러오지 못했습니다. 목록에서 같은 지역의 도서관을 볼 수 있습니다.</span>
                    {/* 데이터 오류 알림에 이미 목록 보기가 있으면 중복 버튼을 두지 않는다. */}
                    {viewMode === 'map' && !error && (
                      <button
                        type="button"
                        onClick={() => chooseView('list')}
                        className="shrink-0 rounded border border-amber-300 bg-white px-3 py-1 font-medium text-amber-900"
                      >
                        목록 보기
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
