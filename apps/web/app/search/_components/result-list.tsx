'use client'

import Link from 'next/link'
import Image from 'next/image'

type Item = {
  isbn: string
  title: string
  author?: string
  publisher?: string
  coverUrl?: string | null
  libraryHoldings?: number
  loanAvailable?: number
}

type Props = {
  isLoading: boolean
  items?: Item[]
  error?: unknown
  query: string
}

export function ResultList({ isLoading, items = [], error, query }: Props) {
  if (error) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        검색 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.
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
      {items.map((item) => (
        <li key={item.isbn}>
          <Link
            href={`/book/${item.isbn}`}
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
              <h3 className="font-bold text-gray-900 truncate text-lg">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {item.author}
                {item.publisher && ` · ${item.publisher}`}
              </p>
              <p className="text-sm text-blue-600 mt-2">
                📚 {item.libraryHoldings ?? 0}권 보유
                {item.loanAvailable !== undefined && item.loanAvailable > 0 && (
                  <span className="ml-2 text-green-600">
                    ({item.loanAvailable}권 대출 가능)
                  </span>
                )}
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
        <li>&ldquo;{query}&rdquo;의 철자를 확인해 보세요</li>
        <li>더 짧은 단어로 검색해 보세요</li>
        <li>저자명만 검색해 보세요</li>
      </ul>
    </div>
  )
}
