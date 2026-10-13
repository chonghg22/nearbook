import Link from 'next/link'
import type { Metadata } from 'next'
import { CATEGORIES } from '@/lib/category-config'
import { BookGrid, ExploreShell } from '../explore/_components/explore-ui'
import { CurationNote, ExploreFeedback } from '../explore/_components/explore-feedback'
import { exploreBooks, exploreCategories } from '@/lib/explore-data'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 0

export const metadata: Metadata = buildPageMetadata({
  path: '/category',
  title: '분야별 인기 도서',
  description:
    '소설, 경제·경영, 심리학, 역사 등 관심 분야별로 도서관에서 많이 빌려 간 책을 확인하세요. 실제 대출 기록 기준 추천입니다.',
})

export default async function CategoryPage() {
  const [categories, result] = await Promise.all([
    exploreCategories(), exploreBooks(`/books/by-category?categoryCode=${encodeURIComponent(CATEGORIES[0]!.kdcCode)}&limit=40`),
  ])
  const countMap = new Map(categories.items.map((c) => [c.code, c.count]))

  // 집계 오류·부분 갱신으로 매칭되지 않아도 카테고리 간 내부 링크는 보존한다.
  // 항상 전체 카테고리를 노출하고, 집계가 있으면 부가 정보로만 보여준다.
  const displayCategories = CATEGORIES

  // 첫 번째 카테고리의 도서를 미리보기로 표시
  const firstCategory = displayCategories[0]
  const previewBooks = result.items

  return (
    <ExploreShell
      title="분야별 인기 도서"
      description="관심 있는 분야를 고르면 전국 공공도서관에서 그 분야 사람들이 가장 많이 빌려 간 책을 보여드립니다."
    >
      <nav className="mb-8 flex flex-wrap gap-3" aria-label="도서 분야">
        {displayCategories.map((cat, index) => {
          const count = countMap.get(cat.kdcCode) ?? 0
          const isFirst = index === 0
          return (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isFirst
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700'
              }`}
              title={cat.seoDescription}
            >
              <span>{cat.label}</span>
              {count > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${isFirst ? 'bg-white/15 text-primary-50' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      {categories.status === 'error' && <p role="status" className="mb-4 text-sm text-gray-600">분야별 집계 정보를 불러오지 못했습니다. 도서 목록과 다른 분야 링크는 계속 이용할 수 있습니다.</p>}
      {firstCategory && (
        <div className="mb-6 rounded-2xl bg-white px-5 py-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-100">
          <strong className="text-gray-900">{firstCategory.label}</strong>
          <span className="ml-2">{firstCategory.introduction}</span>
        </div>
      )}
      <ExploreFeedback status={result.status} retryHref="/category" emptyMessage="선택한 분야에 저장된 도서 목록이 없습니다. 다른 분야를 둘러보세요." />
      {result.status === 'ready' && <BookGrid
        books={previewBooks}
        emptyMessage="저장된 분야별 도서 목록이 없습니다."
      />}
      <CurationNote items={previewBooks} fallback={categories.items.find((item) => item.code === firstCategory?.kdcCode)} source="데이터 출처: 도서관 정보나루 인기대출도서 · 매일 수집을 시도합니다" />
    </ExploreShell>
  )
}
