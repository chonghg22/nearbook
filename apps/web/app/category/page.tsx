import Link from 'next/link'
import type { Metadata } from 'next'
import { CATEGORIES, CATEGORY_BY_KDC } from '@/lib/category-config'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../explore/_components/explore-ui'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 3600 // 1시간

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL!

export const metadata: Metadata = buildPageMetadata({
  path: '/category',
  title: '분야별 인기 도서',
  description:
    '소설, 경제·경영, 심리학, 역사 등 관심 분야별로 도서관에서 많이 빌려 간 책을 확인하세요. 실제 대출 기록 기준 추천입니다.',
})

type CategoryApiItem = {
  code: string
  name: string
  count: number
  periodKey?: string
}

async function fetchCategories(): Promise<CategoryApiItem[]> {
  try {
    const res = await fetch(`${API_URL}/books/categories?limit=40`, { next: { revalidate: 21600 } })
    if (!res.ok) return []
    const json = await res.json()
    const rows = Array.isArray(json.data) ? json.data : []
    return rows
      .map((item: Record<string, unknown>) => ({
        code: String(item.code ?? item.categoryCode ?? ''),
        name: String(item.name ?? ''),
        count: Number(item.count ?? 0),
        periodKey: typeof item.periodKey === 'string' ? item.periodKey : undefined,
      }))
      .filter((item: CategoryApiItem) => Boolean(item.code) && item.count > 0)
  } catch {
    return []
  }
}

async function fetchBooks(categoryCode: string): Promise<ExploreBook[]> {
  try {
    const res = await fetch(`${API_URL}/books/by-category?categoryCode=${encodeURIComponent(categoryCode)}&limit=40`, {
      next: { revalidate: 21600 },
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function CategoryPage() {
  const apiCategories = await fetchCategories()
  const countMap = new Map(apiCategories.map((c) => [c.code, c.count]))

  // 큐레이션 집계 API는 1자리 KDC 대분류를 돌려주고, 화면 카테고리는 2자리 세분류를 쓴다.
  // 집계에 매칭되지 않는다고 카테고리를 숨기면 카테고리 간 내부 링크가 통째로 끊긴다.
  // 항상 전체 카테고리를 노출하고, 집계가 있으면 부가 정보로만 보여준다.
  const displayCategories = CATEGORIES

  // 첫 번째 카테고리의 도서를 미리보기로 표시
  const firstCategory = displayCategories[0]
  const previewBooks = firstCategory ? await fetchBooks(firstCategory.kdcCode) : []

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
      {firstCategory && (
        <div className="mb-6 rounded-2xl bg-white px-5 py-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-100">
          <strong className="text-gray-900">{firstCategory.label}</strong>
          <span className="ml-2">{firstCategory.introduction}</span>
        </div>
      )}
      <BookGrid
        books={previewBooks}
        emptyMessage="분야별 추천 도서를 준비하고 있습니다. 잠시 후 다시 확인해 주세요."
      />
      <SourceNote>데이터 출처: 도서관 정보나루 인기대출도서 · 매일 갱신</SourceNote>
    </ExploreShell>
  )
}
