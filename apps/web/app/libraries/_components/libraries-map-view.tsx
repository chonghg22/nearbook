'use client'

import { useState, useCallback } from 'react'
import { useMapLibraries } from '@/hooks/use-map-libraries'
import { NaverInteractiveMap } from '@/components/maps/naver-interactive-map'
import type { NaverBounds } from '@/hooks/use-naver-map'

interface LibraryItem {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  region?: string
}

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

export function LibrariesMapView() {
  const [sido, setSido] = useState<string>('')
  const [sigungu, setSigungu] = useState<string>('')
  const [regionCenter, setRegionCenter] = useState<{ lat: number; lng: number; zoom?: number } | undefined>(undefined)
  const [bounds, setBounds] = useState<NaverBounds | null>(null)
  const [hoveredLibraryId, setHoveredLibraryId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'split'>('split')

  // 시군구 목록 (시도 선택 시 동적)
  const sigunguList = sido ? REGION_MAP[sido] ?? [] : []

  // bounds 기반 도서관 목록 (지도 인증 실패 시에도 서울 기본값으로 동작)
  const { libraries, isLoading, error } = useMapLibraries(bounds)

  const handleSidoChange = useCallback((value: string) => {
    setSido(value)
    setSigungu('')
    if (value && SIDO_CENTER[value]) {
      setRegionCenter(SIDO_CENTER[value])
    } else {
      setRegionCenter(undefined)
    }
  }, [])

  const handleSigunguChange = useCallback(async (value: string) => {
    setSigungu(value)
    if (!sido) return

    const params = new URLSearchParams({ sido })
    if (value) params.append('sigungu', value)

    try {
      const res = await fetch(`/api/libraries/region-center?${params}`)
      const { lat, lng, zoom } = await res.json()
      if (lat && lng) {
        setRegionCenter({ lat, lng, zoom: zoom ?? 13 })
      }
    } catch (e) {
      console.warn('region-center fetch failed', e)
    }
  }, [sido])

  const handleBoundsChange = useCallback((newBounds: NaverBounds) => {
    setBounds(newBounds)
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* 상단 필터 바 */}
      <div className="flex items-center gap-2 p-3 border-b bg-white z-10 flex-shrink-0">
        {/* 지역 필터 */}
        <div className="flex gap-2">
          {/* 시도 */}
          <select
            value={sido}
            onChange={(e) => handleSidoChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]"
          >
            <option value="">전체 시도</option>
            {SIDO_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* 시군구 — 시도 선택 후 활성화 */}
          <select
            value={sigungu}
            onChange={(e) => handleSigunguChange(e.target.value)}
            disabled={!sido || sigunguList.length === 0}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">전체 시군구</option>
            {sigunguList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 뷰 모드 토글 */}
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            목록
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            지도
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded text-sm hidden md:block ${viewMode === 'split' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            분할
          </button>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 목록 패널 */}
        {(viewMode === 'list' || viewMode === 'split') && (
          <div
            className={`overflow-y-auto ${viewMode === 'split' ? 'w-[400px] min-w-[320px]' : 'w-full'} border-r`}
          >
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">불러오는 중...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-400 text-sm">{error}</div>
            ) : libraries.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                {sido
                  ? '해당 지역에 도서관이 없습니다'
                  : '지역을 선택하거나 지도를 이동해 보세요'}
              </div>
            ) : (
              libraries.map((lib) => (
                <a
                  key={lib.id}
                  href={`/library/${lib.id}`}
                  className={`block p-3 border-b hover:bg-blue-50 transition-colors ${
                    hoveredLibraryId === lib.id ? 'bg-blue-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredLibraryId(lib.id)}
                  onMouseLeave={() => setHoveredLibraryId(null)}
                >
                  <p className="font-medium text-sm">{lib.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{lib.address}</p>
                </a>
              ))
            )}
          </div>
        )}

        {/* 지도 패널 */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className="flex-1">
            <NaverInteractiveMap
              onBoundsChange={handleBoundsChange}
              libraries={libraries}
              selectedLibraryId={hoveredLibraryId}
              regionCenter={regionCenter}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
