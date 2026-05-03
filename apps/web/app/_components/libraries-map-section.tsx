'use client'

import { useState, useCallback } from 'react'
import { NaverInteractiveMap } from '@/components/maps/naver-interactive-map'
import { useMapLibraries } from '@/hooks/use-map-libraries'
import type { NaverBounds } from '@/hooks/use-naver-map'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LibrariesMapSection() {
  const [bounds, setBounds] = useState<NaverBounds | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleBoundsChange = useCallback((b: NaverBounds) => {
    setBounds(b)
  }, [])

  const { libraries, isLoading } = useMapLibraries(bounds)

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">내 주변 도서관</h2>
        <Link
          href="/libraries"
          className="text-xs font-semibold text-primary hover:text-primary-600 transition-colors"
        >
          전체 보기 →
        </Link>
      </div>

      <div className="rounded-2xl overflow-hidden border border-border shadow-card bg-white p-1"
           style={{ height: '420px' }}>
        <div className="w-full h-full rounded-xl overflow-hidden grayscale-[0.2]">
          <NaverInteractiveMap
            onBoundsChange={handleBoundsChange}
            libraries={libraries}
            selectedLibraryId={selectedId}
            onMarkerClick={setSelectedId}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* 지도 아래 도서관 목록 (최대 6개) */}
      {libraries.length > 0 && (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {libraries.slice(0, 6).map((lib) => (
            <li key={lib.id}>
              <Link
                href={`/library/${lib.id}`}
                className={cn(
                  "block px-4 py-3 rounded-xl border text-sm transition-all duration-200 shadow-card",
                  selectedId === lib.id
                    ? "border-primary bg-primary text-white font-semibold ring-4 ring-primary/10"
                    : "border-border bg-white text-foreground hover:border-primary/50 hover:text-primary"
                )}
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
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            주변 도서관 검색 중...
          </p>
        </div>
      )}
    </section>
  )
}
