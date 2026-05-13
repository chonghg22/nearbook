'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import useSWR from 'swr'
import { SearchBar } from './search-bar'
import { FilterPanel } from './filter-panel'
import { ResultList } from './result-list'
import { Pagination } from './pagination'
import { PopularQueries } from './popular-queries'
import { apiFetch } from '@/lib/api-client'

const PAGE_SIZE = 10

const fetcher = (path: string) => apiFetch(path).then(r => r.json())

export function SearchPageInner() {
  const params = useSearchParams()
  const router = useRouter()

  const q = params.get('q') || ''
  const sort = params.get('sort') || 'relevance'
  const searchType = params.get('searchType') || 'title'
  const page = Number(params.get('page') || '1')

  const buildSearchUrl = (): string | null => {
    if (!q) return null
    const qs = new URLSearchParams({
      q,
      pageSize: String(PAGE_SIZE),
      page: String(page),
      ...(searchType !== 'title' && { searchType }),
      ...(sort !== 'relevance' && { sort }),
    })
    return `/search?${qs.toString()}`
  }

  const { data, isLoading } = useSWR(
    buildSearchUrl(),
    fetcher,
    { keepPreviousData: true },
  )

  const total = data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const pushParams = useCallback((overrides: Record<string, string>) => {
    const next = new URLSearchParams({ q, sort, searchType, page: String(page) })
    for (const [k, v] of Object.entries(overrides)) {
      next.set(k, v)
    }
    // 필터 변경 시 페이지 1로 리셋
    if (!('page' in overrides)) {
      next.set('page', '1')
    }
    router.push(`/search?${next.toString()}`)
  }, [q, sort, searchType, page, router])

  const handleSearch = useCallback((query: string) => {
    const next = new URLSearchParams({ q: query, searchType })
    router.push(`/search?${next.toString()}`)
  }, [router, searchType])

  const handleFilterChange = useCallback((key: string, value: string | null) => {
    if (value === null) return
    pushParams({ [key]: value })
  }, [pushParams])

  const handlePageChange = useCallback((p: number) => {
    pushParams({ page: String(p) })
  }, [pushParams])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SearchBar defaultValue={q} onSubmit={handleSearch} />

      {q ? (
        <>
          <div className="flex items-center gap-3 my-4">
            <p className="text-sm text-gray-500">
              &ldquo;{q}&rdquo; 검색결과 {total}건
            </p>
          </div>
          <FilterPanel
            searchType={searchType}
            sort={sort}
            onChange={handleFilterChange}
          />
          <ResultList
            isLoading={isLoading}
            items={data?.data?.items}
            query={q}
          />
          {total > PAGE_SIZE && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <PopularQueries onSelect={handleSearch} />
      )}
    </div>
  )
}
