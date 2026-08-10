import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SearchPageInner } from './_components/search-page-inner'
import { buildPageMetadata } from '@/lib/seo/metadata'

// 검색 결과는 쿼리마다 내용이 달라 고유 콘텐츠를 보장할 수 없다.
// 색인은 막되 링크는 따라가게 해서 책 상세로 가는 크롤 경로는 유지한다.
export const metadata: Metadata = buildPageMetadata({
  path: '/search',
  title: '책 검색',
  description: '책 제목이나 저자로 검색하고, 우리 동네 공공도서관의 소장 여부를 확인하세요.',
  index: false,
})

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
