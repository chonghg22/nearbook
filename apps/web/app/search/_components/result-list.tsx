'use client'

import Link from 'next/link'
import Image from 'next/image'
import { trackEvent } from '@/lib/analytics'
import { authorNames, searchEditionLabels, type SearchBook } from '@nearbook/shared-types'

type Item = SearchBook

type Props = {
  isLoading: boolean
  items?: Item[]
  error?: unknown
  query: string
  page?: number
  pageSize?: number
  searchType?: string
  sort?: string
}

export function ResultList({ isLoading, items = [], error, query, page = 1, pageSize = 10, searchType = 'all', sort = 'relevance' }: Props) {
  if (error) {
    return (
      <p role="alert" className="py-12 text-center text-sm text-gray-500">
        검색 정보를 불러오지 못했습니다. 검색 결과가 없다는 뜻은 아닙니다. 잠시 후 다시 시도해 주세요.
      </p>
    )
  }

  if (isLoading && items.length === 0) {
    return <ResultSkeleton />
  }

  if (!isLoading && items.length === 0) {
    return <EmptyState query={query} />
  }

  return (
    <ul className="space-y-3 mt-4">
      {items.map((item, index) => (
        <li key={item.isbn}>
          <Link
            href={`/book/${item.isbn}`}
            onClick={() => {
              trackEvent('book_result_click', {
                isbn: item.isbn,
                title: item.title,
                query,
                page, searchType, sort, rank: (page - 1) * pageSize + index + 1,
                source: 'search_page', surface: 'results',
              })
            }}
            className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 w-15 h-22 relative">
              {item.coverUrl ? (
                <Image
                  src={item.coverUrl}
                  alt={item.title}
                  width={60}
                  height={90}
                  className="object-cover rounded shadow-sm"
                  unoptimized
                />
              ) : (
                <div className="w-[60px] h-[90px] bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400 text-center px-1">
                  표지 없음
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 line-clamp-2 text-lg [overflow-wrap:anywhere]" title={item.title}>
                {item.title}
              </h3>
              {searchEditionLabels(item.title).length > 0 && <p className="mt-1 flex flex-wrap gap-1">
                {searchEditionLabels(item.title).map(label => <span key={label} className="rounded border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs text-primary-700">{label}</span>)}
              </p>}
              <p className="text-sm text-gray-500 mt-0.5 [overflow-wrap:anywhere]" title={item.author ?? undefined}>
                {item.author ? authorNames(item.author) : '저자 정보 없음'}
                {item.publisher && ` · ${item.publisher}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">ISBN <span className="font-mono">{item.isbn}</span></p>
              <p className="text-xs text-gray-400 mt-2">
                소장 정보는 상세 페이지에서 확인
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ResultSkeleton() {
  return (
    <ul className="space-y-3 mt-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg animate-pulse"
        >
          <div className="w-[60px] h-[90px] bg-gray-100 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-4 bg-gray-100 rounded w-1/4" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="py-12 text-center text-gray-500">
      <p className="text-2xl mb-2">😔</p>
      <p className="font-medium mb-4">검색 결과가 없어요.</p>
      <ul className="text-sm space-y-1">
        <li>책 제목 일부만 입력해 보세요</li>
        <li>저자 이름만 검색해 보세요</li>
        <li>띄어쓰기를 다르게 해 보세요</li>
      </ul>
      <Link
        href="/scan"
        className="mt-5 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100 md:hidden"
      >
        📷 바코드 스캔으로 빠르게 찾기
      </Link>
    </div>
  )
}
