'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { SearchBar } from './search-bar'
import { FilterPanel } from './filter-panel'
import { ResultList } from './result-list'
import { Pagination } from './pagination'
import { PopularQueries } from './popular-queries'
import { publicApiJson } from '@/lib/public-api-client'
import { parseSearchResult } from '@/lib/api-contracts'
import { trackEvent } from '@/lib/analytics'

const PAGE_SIZE = 10

const fetcher = (path: string) => publicApiJson(path, parseSearchResult, { timeoutMs: 15000 })

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

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    buildSearchUrl(),
    fetcher,
    { keepPreviousData: false, shouldRetryOnError: false },
  )
  const lastResultEventKey = useRef<string | null>(null)

  const total = data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    if (!q || !data?.data || isLoading || error) return

    const eventKey = `${q}:${searchType}:${sort}:${page}:${total}`
    if (lastResultEventKey.current === eventKey) return
    lastResultEventKey.current = eventKey

    trackEvent('search_result_view', {
      query: q,
      searchType,
      sort,
      page,
      pageSize: PAGE_SIZE,
      total,
      resultCount: data.data.items?.length ?? 0,
      durationMs: data.data.durationMs,
      zeroResult: total === 0,
    })
  }, [data, error, isLoading, page, q, searchType, sort, total])

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
    const nextQuery = query.trim()
    if (!nextQuery) return

    trackEvent('search_submit', {
      query: nextQuery,
      searchType,
      source: 'search_page',
    })

    const next = new URLSearchParams({ q: nextQuery, searchType })
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
              &ldquo;{q}&rdquo; {error ? '검색 결과를 불러오지 못했습니다' : isLoading ? '검색 중...' : `검색결과 ${total}건`}
            </p>
          </div>
          <FilterPanel
            searchType={searchType}
            sort={sort}
            onChange={handleFilterChange}
          />
          <ResultList
            isLoading={isLoading || isValidating}
            items={data?.data?.items ?? []}
            error={error}
            query={q}
          />
          {error && <div className="text-center"><button type="button" onClick={() => { void mutate() }} className="rounded-full bg-primary px-5 py-2 text-sm text-white" disabled={isValidating}>다시 시도</button></div>}
          {!error && total > PAGE_SIZE && (
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
