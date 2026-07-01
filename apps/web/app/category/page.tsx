import Link from 'next/link'
import type { Metadata } from 'next'
import { CATEGORIES, CATEGORY_BY_KDC } from '@/lib/category-config'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../explore/_components/explore-ui'
import { SERVER_API_BASE_URL } from '@/lib/constants'

export const revalidate = 3600 // 1시간

const API_URL = SERVER_API_BASE_URL

export const metadata: Metadata = {
  title: '카테고리 | 우리동네책',
  description: '도서관 대출 데이터 기반, 카테고리별 인기 도서를 확인하세요.',
}

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

  // 세분화 카테고리(2자리 코드) 우선 표시, 대분류(1자리)는 세분화가 없는 경우만
  const displayCategories = CATEGORIES.filter((cat) => {
    const count = countMap.get(cat.kdcCode) ?? 0
    return count > 0
  })

  // 첫 번째 카테고리의 도서를 미리보기로 표시
  const firstCategory = displayCategories[0]
  const previewBooks = firstCategory ? await fetchBooks(firstCategory.kdcCode) : []

  return (
    <ExploreShell
      title="카테고리"
      description="전국 공공도서관 대출 데이터를 기반으로 카테고리별 인기 도서를 소개합니다."
    >
      {displayCategories.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-3">
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
                <span className={`rounded-full px-2 py-0.5 text-xs ${isFirst ? 'bg-white/15 text-primary-50' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="mb-8 rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-500">
          아직 준비된 카테고리 큐레이션 데이터가 없습니다.
        </div>
      )}
      {firstCategory && (
        <div className="mb-6 rounded-2xl bg-white px-5 py-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-100">
          <strong className="text-gray-900">{firstCategory.label}</strong>
          <span className="ml-2">{firstCategory.introduction}</span>
        </div>
      )}
      <BookGrid
        books={previewBooks}
        emptyMessage="카테고리 큐레이션 도서가 아직 없습니다."
      />
      <SourceNote>
        각 카테고리를 클릭하면 상세 페이지로 이동합니다 · 도서관 정보나루 인기대출도서 API 기반 · 매일 자동 갱신
      </SourceNote>
    </ExploreShell>
  )
}
