import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SearchPageInner } from './_components/search-page-inner'

export const metadata: Metadata = {
  title: '검색 | 우리동네책',
  robots: { index: false, follow: true },
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchPageInner />
    </Suspense>
  )
}

function SearchSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-12 bg-gray-200 rounded-lg mb-4" />
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-6" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 rounded mb-3" />
      ))}
    </div>
  )
}
