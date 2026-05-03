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

  const handleFilterChange = useCallback((filters: Record<string, string>) => {
    const next = new URLSearchParams({ q, ...filters })
    router.push(`/search?${next.toString()}`)
  }, [q, router])

  return (
    <main className="min-h-screen bg-canvas">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <SearchBar defaultValue={q} onSubmit={handleSearch} size="lg" />

        {q ? (
          <div className="mt-8">
            <div className="flex flex-col gap-4 mb-6">
              <LocationBar />
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">&ldquo;{q}&rdquo;</span> 검색결과 {data?.data?.total ?? 0}건
                  {data?.data?.source === 'jeongbonaru' && (
                    <span className="ml-2 text-primary text-2xs font-medium uppercase tracking-wider bg-primary/5 px-1.5 py-0.5 rounded">정보나루</span>
                  )}
                </p>
              </div>
            </div>

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
          </div>
        ) : (
          <div className="mt-12">
            <PopularQueries onSelect={handleSearch} />
          </div>
        )}
      </div>
    </main>
  )
}
