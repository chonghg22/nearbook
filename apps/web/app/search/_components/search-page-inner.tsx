'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import useSWR from 'swr'
import { SearchBar } from './search-bar'
import { FilterPanel } from './filter-panel'
import { ResultList } from './result-list'
import { PopularQueries } from './popular-queries'
import { apiFetch } from '@/lib/api-client'

const fetcher = (path: string) => apiFetch(path).then(r => r.json())

export function SearchPageInner() {
  const params = useSearchParams()
  const router = useRouter()

  const q = params.get('q') || ''
  const sort = params.get('sort') || 'relevance'
  const category = params.get('category') || ''

  const buildSearchUrl = (): string | null => {
    if (!q) return null
    const qs = new URLSearchParams({
      q,
      ...(sort !== 'relevance' && { sort }),
      ...(category && { category }),
    })
    return `/search?${qs.toString()}`
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
    })
    if (value === null) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    router.push(`/search?${next.toString()}`)
  }, [q, sort, category, router])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SearchBar defaultValue={q} onSubmit={handleSearch} />

      {q ? (
        <>
          <div className="flex items-center gap-3 my-4">
            <p className="text-sm text-gray-500">
              &ldquo;{q}&rdquo; 검색결과 {data?.data?.total ?? 0}건
            </p>
          </div>
          <FilterPanel
            sort={sort}
            category={category}
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
