'use client'
import { useState, useEffect } from 'react'
import { LibraryMap } from './library-map'
import { RegionSelector } from './region-selector'

export function MapSection() {
  const [regionFilter, setRegionFilter] = useState<string | undefined>(undefined)
  const [userLat, setUserLat] = useState(37.5665) // 서울 시청 기본
  const [userLng, setUserLng] = useState(126.9780)

  // 최초 마운트 시 브라우저 위치 권한 요청 (있으면 사용)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
      },
      () => {
        // 거부 또는 실패 → 서울 시청 default 유지
      },
      { timeout: 5000 },
    )
  }, [])

  return (
    <div className="space-y-4">
      {/* 상단 필터 */}
      <div
        className="flex flex-wrap items-center gap-4 p-4
                      bg-gray-50 rounded-xl border border-gray-100"
      >
        <RegionSelector onChange={(region) => setRegionFilter(region)} />

        {/* 내 위치로 돌아가기 */}
        <button
          onClick={() => {
            setRegionFilter(undefined)
            // LibraryMap에서 idle 이벤트로 자동 재검색됨
          }}
          className="ml-auto text-sm text-blue-600 hover:underline"
        >
          📍 현재 위치로
        </button>
      </div>

      {/* 지도 */}
      <LibraryMap
        initialLat={userLat}
        initialLng={userLng}
        initialZoom={13}
        regionFilter={regionFilter}
      />

      {/* 안내 */}
      <p className="text-xs text-gray-400 text-center">
        지도를 드래그하거나 확대·축소하면 해당 위치의 도서관이 자동으로 표시됩니다.
      </p>
    </div>
  )
}
