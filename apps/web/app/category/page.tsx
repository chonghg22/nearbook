import Link from 'next/link'
import type { Metadata } from 'next'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../explore/_components/explore-ui'

export const revalidate = 21600

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL!

export const metadata: Metadata = {
  title: '카테고리 | 우리동네책',
  description: '캐시된 도서 데이터를 카테고리별로 탐색하세요.',
}

type CategoryItem = {
  code: string
  name: string
  description: string
  count: number
  periodKey?: string
}

const CATEGORY_META: Record<string, Pick<CategoryItem, 'name' | 'description'>> = {
  '0': { name: '총류', description: '컴퓨터, 독서, 백과, 정보 분야 도서' },
  '1': { name: '철학', description: '철학, 심리학, 윤리 분야 도서' },
  '2': { name: '종교', description: '종교와 신앙 분야 도서' },
  '3': { name: '사회과학', description: '경제, 경영, 정치, 사회 이슈 도서' },
  '4': { name: '자연과학', description: '수학, 과학, 생명과학 분야 도서' },
  '5': { name: '기술과학', description: '의학, 공학, 생활과학 분야 도서' },
  '6': { name: '예술', description: '미술, 음악, 스포츠, 취미 분야 도서' },
  '7': { name: '언어', description: '한국어, 외국어, 학습 언어 도서' },
  '8': { name: '문학', description: '소설, 시, 에세이 등 문학 분야 인기 도서' },
  '9': { name: '역사', description: '역사, 지리, 여행 분야 도서' },
}

type Props = {
  searchParams?: Promise<{ category?: string; code?: string }>
}

async function fetchCategories(): Promise<CategoryItem[]> {
  const res = await fetch(`${API_URL}/books/categories?limit=40`, { next: { revalidate: 21600 } })
  if (!res.ok) return []
  const json = await res.json()
  const rows = Array.isArray(json.data) ? json.data : []

  return rows
    .map((item: Record<string, unknown>) => {
      const code = String(item.code ?? item.categoryCode ?? '')
      const fallback = CATEGORY_META[code]

      return {
        code,
        name: String(item.name ?? fallback?.name ?? ''),
        description: String(item.description ?? fallback?.description ?? ''),
        count: Number(item.count ?? 0),
        periodKey: typeof item.periodKey === 'string' ? item.periodKey : undefined,
      }
    })
    .filter((item: CategoryItem) => Boolean(item.code))
}

async function fetchBooks(category?: string): Promise<ExploreBook[]> {
  if (!category) return []
  const res = await fetch(`${API_URL}/books/by-category?categoryCode=${encodeURIComponent(category)}&limit=40`, {
    next: { revalidate: 21600 },
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export default async function CategoryPage({ searchParams }: Props) {
  const params = await searchParams
  const rawCategories = await fetchCategories()
  const categories = rawCategories.filter((item) => item.count > 0)
  const requestedCategoryCode = params?.code ?? params?.category
  const selectedCategoryCode = categories.some((item: CategoryItem) => item.code === requestedCategoryCode)
    ? requestedCategoryCode
    : categories[0]?.code
  const initialBooks = await fetchBooks(selectedCategoryCode)
  const books = selectedCategoryCode === (params?.code ?? params?.category)
    ? initialBooks
    : await fetchBooks(selectedCategoryCode)
  const selectedCategory = categories.find((item) => item.code === selectedCategoryCode)

  return (
    <ExploreShell
      title="카테고리"
      description="검색과 API 호출을 통해 이미 저장된 도서 메타데이터를 카테고리별로 묶어 보여줍니다."
    >
      {categories.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-3">
          {categories.map((item) => {
            const selected = item.code === selectedCategoryCode
            return (
              <Link
                key={item.code}
                href={`/category?code=${encodeURIComponent(item.code)}`}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700'
                }`}
                title={item.description}
              >
                <span>{item.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? 'bg-white/15 text-primary-50' : 'bg-gray-100 text-gray-500'}`}>
                  {item.count}
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
      {selectedCategory && (
        <div className="mb-6 rounded-2xl bg-white px-5 py-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-100">
          <strong className="text-gray-900">{selectedCategory.name}</strong>
          <span className="ml-2">{selectedCategory.description}</span>
        </div>
      )}
      <BookGrid
        books={books}
        emptyMessage={selectedCategoryCode ? '이 카테고리에 저장된 큐레이션 도서가 없습니다.' : '카테고리를 선택해주세요.'}
      />
      <SourceNote>갱신 방식: KDC 대분류별 인기대출도서를 월 1회 DB에 저장하고, 화면에서는 저장된 큐레이션만 읽습니다.</SourceNote>
    </ExploreShell>
  )
}
