'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import useSWR from 'swr'
import { SearchBar } from './search-bar'
import { FilterPanel } from './filter-panel'
import { ResultList } from './result-list'
import { PopularQueries } from './popular-queries'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function SearchPageInner() {
  const params = useSearchParams()
  const router = useRouter()

  const q = params.get('q') || ''
  const sort = params.get('sort') || 'relevance'
  const category = params.get('category') || ''
  const availableOnly = params.get('availableOnly') === 'true'

  const queryString = new URLSearchParams({
    ...(q && { q }),
    ...(sort !== 'relevance' && { sort }),
    ...(category && { category }),
    ...(availableOnly && { availableOnly: 'true' }),
  }).toString()

  const { data, isLoading } = useSWR(
    q ? `${API_BASE}/search?${queryString}` : null,
    fetcher,
    { keepPreviousData: true },
  )

  const handleSearch = useCallback((query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }, [router])

  const handleFilterChange = useCallback((filters: Record<string, string>) => {
    const next = new URLSearchParams({ q, ...filters })
    router.push(`/search?${next.toString()}`)
  }, [q, router])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SearchBar defaultValue={q} onSubmit={handleSearch} />

      {q ? (
        <>
          <p className="my-4 text-sm text-gray-500">
            &ldquo;{q}&rdquo; 검색결과 {data?.data?.total ?? 0}건
            {data?.data?.source === 'jeongbonaru' && (
              <span className="ml-2 text-blue-500 text-xs">(정보나루 검색)</span>
            )}
          </p>
          <FilterPanel
            current={{ sort, category, availableOnly }}
            onChange={handleFilterChange}
          />
          <ResultList
            isLoading={isLoading}
            items={data?.data?.items}
            suggestions={data?.data?.suggestions}
            trending={data?.data?.trending}
          />
        </>
      ) : (
        <PopularQueries onSelect={handleSearch} />
      )}
    </div>
  )
}
