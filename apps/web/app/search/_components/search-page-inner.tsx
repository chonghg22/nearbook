'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { SearchBar } from './search-bar'
import { FilterPanel } from './filter-panel'
import { ResultList } from './result-list'
import { Pagination } from './pagination'
import { PopularQueries } from './popular-queries'
import { publicApiJson } from '@/lib/public-api-client'
import { parseSearchResult } from '@/lib/api-contracts'
import { trackEvent } from '@/lib/analytics'
import { resolveSearchInput } from '@nearbook/shared-types'
import { markUsefulAction } from '@/lib/pwa-install-eligibility'

const PAGE_SIZE = 10

const fetcher = (path: string) => publicApiJson(path, parseSearchResult, { timeoutMs: 15000 })

export function SearchPageInner() {
  const params = useSearchParams()
  const router = useRouter()

  const q = params.get('q') || ''
  const sort = params.get('sort') || 'relevance'
  const requestedSearchType = params.get('searchType') || 'all'
  const input = resolveSearchInput(q, requestedSearchType)
  const searchType = input.searchType
  const requestedPage = Number(params.get('page') || '1')
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const buildSearchUrl = (): string | null => {
    if (!input.q || input.invalidIsbn) return null
    const qs = new URLSearchParams({
      q: input.q,
      pageSize: String(PAGE_SIZE),
      page: String(page),
      ...(searchType !== 'all' && { searchType }),
      ...(sort !== 'relevance' && { sort }),
    })
    return `/search?${qs.toString()}`
  }

  const searchUrl = buildSearchUrl()
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    searchUrl,
    fetcher,
    { keepPreviousData: false, shouldRetryOnError: false },
  )
  const lastResultEventKey = useRef<string | null>(null)
  const [poll, setPoll] = useState({ key: searchUrl, attempts: 0 })
  const pollAttempts = poll.key === searchUrl ? poll.attempts : 0
  const pending = data?.data?.enrichmentPending === true
  const resultError = error || (data?.data?.enrichmentFailed ? new Error('enrichment unavailable') : undefined)

  useEffect(() => {
    if (!pending || error || isValidating || pollAttempts >= 15) return
    const timer = setTimeout(() => {
      setPoll({ key: searchUrl, attempts: pollAttempts + 1 })
      void mutate()
    }, 2000)
    return () => clearTimeout(timer)
  }, [pending, error, isValidating, mutate, pollAttempts, searchUrl])

  const total = data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    if (!q || !data?.data || isLoading || error || pending || data.data.enrichmentFailed) return

    const eventKey = `${q}:${searchType}:${sort}:${page}:${total}`
    if (lastResultEventKey.current === eventKey) return
    lastResultEventKey.current = eventKey
    if (data.data.items.length > 0) markUsefulAction()

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
  }, [data, error, isLoading, pending, page, q, searchType, sort, total])

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
      searchType: resolveSearchInput(nextQuery, requestedSearchType).searchType,
      source: 'search_page',
    })

    // Automatic ISBN detection is query-specific, not a sticky user-selected mode.
    const next = new URLSearchParams({ q: nextQuery,
      ...(requestedSearchType !== 'all' && { searchType: requestedSearchType }) })
    router.push(`/search?${next.toString()}`)
  }, [router, requestedSearchType])

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
            <p className="min-w-0 text-sm text-gray-500 [overflow-wrap:anywhere]">
              &ldquo;{q}&rdquo; {input.invalidIsbn ? 'ISBN 입력을 확인해 주세요' : resultError ? '검색 결과를 불러오지 못했습니다' : isLoading ? '검색 중...' : pending ? '추가 도서 정보를 확인 중입니다' : `검색결과 ${total}건`}
            </p>
          </div>
          <FilterPanel
            searchType={searchType}
            sort={sort}
            onChange={handleFilterChange}
          />
          {searchType === 'isbn' && !input.invalidIsbn && <p className="mt-3 text-xs text-muted-foreground">ISBN을 감지해 {input.q}와 정확히 일치하는 책을 찾습니다. 다른 판본은 ISBN이 다를 수 있습니다.</p>}
          {pending && <p role="status" className="mt-4 text-sm text-muted-foreground">{pollAttempts >= 15 ? '추가 도서 확인이 지연되고 있습니다. 다시 확인해 주세요.' : '추가 도서 정보를 확인하고 있습니다. 잠시 기다려 주세요.'}</p>}
          {input.invalidIsbn ? <p role="alert" className="py-8 text-sm text-muted-foreground">체크 숫자가 유효한 ISBN-10 또는 ISBN-13을 입력해 주세요. 공백과 하이픈은 사용할 수 있습니다.</p> : !resultError && !isLoading && !pending && total > 0 && page > totalPages ? <div role="status" className="py-12 text-center"><p>현재 검색 결과에 없는 페이지입니다.</p><button type="button" className="mt-4 rounded-full bg-primary px-5 py-2 text-sm text-white" onClick={() => handlePageChange(1)}>첫 페이지로 돌아가기</button></div> : <ResultList
            isLoading={isLoading || isValidating || pending}
            items={data?.data?.items ?? []}
            error={resultError}
            query={q}
          />}
          {!input.invalidIsbn && <p className="mt-3 text-xs text-muted-foreground">큰글자·필사 표기는 책 제목을 기준으로 표시합니다. 표기가 없는 책의 판본을 확정하는 정보는 아니며, 상세 페이지에서 ISBN을 확인해 주세요.</p>}
          {!input.invalidIsbn && <p className="mt-2 text-xs text-muted-foreground">총건수는 현재 검색 가능한 도서 기준입니다. 추가 도서 정보는 다음 검색에 반영될 수 있습니다.</p>}
          {(resultError || (pending && pollAttempts >= 15)) && <div className="text-center"><button type="button" onClick={() => { setPoll({ key: searchUrl, attempts: 0 }); void mutate() }} className="rounded-full bg-primary px-5 py-2 text-sm text-white" disabled={isValidating}>다시 시도</button></div>}
          {!resultError && !isLoading && !pending && total > PAGE_SIZE && page <= totalPages && (
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
