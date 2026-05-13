import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CATEGORIES, CATEGORY_BY_SLUG } from '@/lib/category-config'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../../explore/_components/explore-ui'

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.near-book.com'

export const revalidate = 86400 // 24시간
export const dynamicParams = false

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = CATEGORY_BY_SLUG.get(slug)
  if (!category) return {}

  const title = `${category.seoTitle} | 우리동네책`
  const url = `${SITE_URL}/category/${slug}`

  return {
    title,
    description: category.seoDescription,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: category.seoDescription,
      url,
      type: 'website',
    },
  }
}

async function fetchBooks(kdcCode: string): Promise<ExploreBook[]> {
  try {
    const res = await fetch(
      `${API_URL}/books/by-category?categoryCode=${encodeURIComponent(kdcCode)}&limit=40`,
      { next: { revalidate } },
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params
  const category = CATEGORY_BY_SLUG.get(slug)
  if (!category) notFound()

  const books = await fetchBooks(category.kdcCode)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category.seoTitle,
    description: category.seoDescription,
    url: `${SITE_URL}/category/${slug}`,
    numberOfItems: books.length,
    itemListElement: books.slice(0, 20).map((book, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Book',
        name: book.title,
        author: book.author ? { '@type': 'Person', name: book.author } : undefined,
        isbn: book.isbn,
        url: `${SITE_URL}/book/${book.isbn}`,
      },
    })),
  }

  return (
    <ExploreShell
      title={`${category.label} 인기 대출도서`}
      description={`전국 공공도서관 대출 데이터 기반 ${category.label} 분야 인기 도서 TOP ${books.length}`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-8 rounded-2xl bg-white px-5 py-4 text-sm leading-relaxed text-gray-600 shadow-sm ring-1 ring-gray-100">
        {category.introduction}
      </div>

      <BookGrid
        books={books}
        emptyMessage="이 카테고리에 저장된 큐레이션 도서가 아직 없습니다."
      />

      <SourceNote>
        도서관 정보나루 인기대출도서 API 기반 · KDC 분류 {category.kdcCode} · 매일 자동 갱신
      </SourceNote>
    </ExploreShell>
  )
}
