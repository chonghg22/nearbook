'use client'

import { useState, useCallback } from 'react'
import { NaverInteractiveMap } from '@/components/maps/naver-interactive-map'
import { useMapLibraries } from '@/hooks/use-map-libraries'
import type { NaverBounds } from '@/hooks/use-naver-map'
import Link from 'next/link'

export function LibrariesMapSection() {
  const [bounds, setBounds] = useState<NaverBounds | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleBoundsChange = useCallback((b: NaverBounds) => {
    setBounds(b)
  }, [])

  const { libraries, isLoading } = useMapLibraries(bounds)

  return (
    <section className="my-12 px-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">내 주변 도서관</h2>
        <Link
          href="/libraries"
          className="text-sm text-blue-600 hover:underline"
        >
          전체 보기 →
        </Link>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
           style={{ height: '420px' }}>
        <NaverInteractiveMap
          onBoundsChange={handleBoundsChange}
          libraries={libraries}
          selectedLibraryId={selectedId}
          onMarkerClick={setSelectedId}
          className="w-full h-full"
        />
      </div>

      {/* 지도 아래 도서관 목록 (최대 6개) */}
      {libraries.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {libraries.slice(0, 6).map((lib) => (
            <li key={lib.id}>
              <Link
                href={`/library/${lib.id}`}
                className={`block px-3 py-2 rounded-lg border text-sm hover:bg-blue-50 transition-colors ${
                  selectedId === lib.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-700'
                }`}
                onMouseEnter={() => setSelectedId(lib.id)}
                onMouseLeave={() => setSelectedId(null)}
              >
                {lib.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isLoading && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          주변 도서관 검색 중...
        </p>
      )}
    </section>
  )
}
