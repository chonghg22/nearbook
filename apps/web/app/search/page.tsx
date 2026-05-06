import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SearchPageInner } from './_components/search-page-inner'

export const metadata: Metadata = {
  title: '검색 | 우리동네책',
  robots: { index: false, follow: true },
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageInner />
    </Suspense>
  )
}

function SearchPageFallback() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="h-14 rounded-lg bg-gray-100 animate-pulse" />
    </main>
  )
}
