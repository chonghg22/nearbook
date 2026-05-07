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
  category: string
  count: number
}

type Props = {
  searchParams?: Promise<{ category?: string }>
}

async function fetchCategories(): Promise<CategoryItem[]> {
  const res = await fetch(`${API_URL}/books/categories?limit=40`, { next: { revalidate: 21600 } })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

async function fetchBooks(category?: string): Promise<ExploreBook[]> {
  if (!category) return []
  const res = await fetch(`${API_URL}/books/by-category?category=${encodeURIComponent(category)}&limit=40`, {
    next: { revalidate: 21600 },
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export default async function CategoryPage({ searchParams }: Props) {
  const params = await searchParams
  const selectedCategory = params?.category
  const [categories, books] = await Promise.all([fetchCategories(), fetchBooks(selectedCategory)])

  return (
    <ExploreShell
      title="카테고리"
      description="검색과 API 호출을 통해 이미 저장된 도서 메타데이터를 카테고리별로 묶어 보여줍니다."
    >
      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((item) => {
          const selected = item.category === selectedCategory
          return (
            <Link
              key={item.category}
              href={`/category?category=${encodeURIComponent(item.category)}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              {item.category}
              <span className={selected ? 'ml-2 text-blue-100' : 'ml-2 text-gray-400'}>{item.count}</span>
            </Link>
          )
        })}
      </div>
      <BookGrid
        books={books}
        emptyMessage={selectedCategory ? '이 카테고리에 저장된 도서가 없습니다.' : '카테고리를 선택해주세요.'}
      />
      <SourceNote>갱신 방식: 검색/API 결과가 쌓인 `book_cache`를 읽습니다. 별도 외부 API를 호출하지 않습니다.</SourceNote>
    </ExploreShell>
  )
}
