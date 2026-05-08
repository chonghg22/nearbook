'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import useSWR from 'swr'
import { SearchBar } from './search-bar'
import { FilterPanel } from './filter-panel'
import { ResultList } from './result-list'
import { PopularQueries } from './popular-queries'
import { LocationBar } from '@/components/location-bar'
import { useLocationContext } from '@/lib/use-location-context'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function SearchPageInner() {
  const params = useSearchParams()
  const router = useRouter()

  const q = params.get('q') || ''
  const sort = params.get('sort') || 'relevance'
  const category = params.get('category') || ''
  const availableOnly = params.get('availableOnly') === 'true'

  const { toSearchParams, isLoaded } = useLocationContext()

  const buildSearchUrl = (): string | null => {
    if (!q || !isLoaded) return null
    const locationParams = toSearchParams()
    const qs = new URLSearchParams({
      q,
      ...(sort !== 'relevance' && { sort }),
      ...(category && { category }),
      ...(availableOnly && { availableOnly: 'true' }),
      ...locationParams,
    })
    return `${API_BASE}/search?${qs.toString()}`
  }

  const { data, isLoading } = useSWR(
    buildSearchUrl(),
    fetcher,
    { keepPreviousData: true },
  )

  const handleSearch = useCallback((query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }, [router])

  const handleFilterChange = useCallback((key: string, value: string | null) => {
    const next = new URLSearchParams({
      q,
      sort,
      category,
      availableOnly: availableOnly.toString(),
    })
    if (value === null) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    router.push(`/search?${next.toString()}`)
  }, [q, sort, category, availableOnly, router])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SearchBar defaultValue={q} onSubmit={handleSearch} />

      {q ? (
        <>
          <div className="mt-4">
            <LocationBar />
          </div>

          <p className="my-4 text-sm text-gray-500">
            &ldquo;{q}&rdquo; 검색결과 {data?.data?.total ?? 0}건
            {data?.data?.source === 'jeongbonaru' && (
              <span className="ml-2 text-primary-500 text-xs">(정보나루 검색)</span>
            )}
          </p>
          <FilterPanel
            sort={sort}
            category={category}
            availableOnly={availableOnly}
            onChange={handleFilterChange}
          />
          <ResultList
            isLoading={isLoading}
            items={data?.data?.items}
            query={q}
          />
        </>
      ) : (
        <PopularQueries onSelect={handleSearch} />
      )}
    </div>
  )
}
