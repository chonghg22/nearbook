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

type Props = {
  searchParams?: Promise<{ category?: string; code?: string }>
}

async function fetchCategories(): Promise<CategoryItem[]> {
  const res = await fetch(`${API_URL}/books/categories?limit=40`, { next: { revalidate: 21600 } })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
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
  const [categories, initialBooks] = await Promise.all([fetchCategories(), fetchBooks(params?.code ?? params?.category)])
  const selectedCategoryCode = params?.code ?? params?.category ?? categories.find((item) => item.count > 0)?.code
  const books = selectedCategoryCode === (params?.code ?? params?.category)
    ? initialBooks
    : await fetchBooks(selectedCategoryCode)
  const selectedCategory = categories.find((item) => item.code === selectedCategoryCode)

  return (
    <ExploreShell
      title="카테고리"
      description="검색과 API 호출을 통해 이미 저장된 도서 메타데이터를 카테고리별로 묶어 보여줍니다."
    >
      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((item) => {
          const selected = item.code === selectedCategoryCode
          return (
            <Link
              key={item.code}
              href={`/category?code=${encodeURIComponent(item.code)}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700'
              }`}
              title={item.description}
            >
              {item.name}
              <span className={selected ? 'ml-2 text-primary-100' : 'ml-2 text-gray-400'}>{item.count}</span>
            </Link>
          )
        })}
      </div>
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
