import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CATEGORIES, CATEGORY_BY_SLUG } from '@/lib/category-config'
import { BookGrid, ExploreShell } from '../../explore/_components/explore-ui'
import { CurationNote, ExploreFeedback } from '../../explore/_components/explore-feedback'
import { exploreBooks, exploreCategories } from '@/lib/explore-server'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBookListJsonLd } from '@/lib/seo/json-ld'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 0
export const dynamicParams = false

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = CATEGORY_BY_SLUG.get(slug)
  if (!category) return {}

  // title에 브랜드를 붙이지 않는다. 루트 layout의 template이 이미 붙인다.
  return buildPageMetadata({
    path: `/category/${slug}`,
    title: category.seoTitle,
    description: category.seoDescription,
  })
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params
  const category = CATEGORY_BY_SLUG.get(slug)
  if (!category) notFound()

  const [result, categories] = await Promise.all([
    exploreBooks(`/books/by-category?categoryCode=${encodeURIComponent(category.kdcCode)}&limit=40`),
    exploreCategories(),
  ])
  const books = result.items
  const countMap = new Map(categories.items.map((item) => [item.code, item.count]))

  // 집계 API의 코드 체계가 달라 매칭되지 않아도 카테고리 링크는 모두 노출한다.
  const displayCategories = CATEGORIES
  const pagePath = `/category/${slug}`

  return (
    <ExploreShell
      title={`${category.label} 인기 대출도서`}
      description={`전국 공공도서관에서 ${category.label} 분야 독자들이 가장 많이 빌려 간 책입니다. 마음에 드는 책을 우리 동네 도서관에서 바로 찾아보세요.`}
    >
      <JsonLd
        data={buildBookListJsonLd({
          path: pagePath,
          name: category.seoTitle,
          description: category.seoDescription,
          books,
          breadcrumbs: [
            { name: '홈', path: '/' },
            { name: '분야별 인기 도서', path: '/category' },
            { name: category.label, path: pagePath },
          ],
        })}
      />

      <nav className="mb-8 flex flex-wrap gap-3" aria-label="도서 분야">
        {displayCategories.map((cat) => {
          const count = countMap.get(cat.kdcCode) ?? 0
          const isCurrent = cat.slug === slug
          return (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isCurrent
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700'
              }`}
              title={cat.seoDescription}
            >
              <span>{cat.label}</span>
              {count > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${isCurrent ? 'bg-white/15 text-primary-50' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {categories.status === 'error' && <p role="status" className="mb-4 text-sm text-gray-600">분야별 집계 정보를 불러오지 못했습니다. 도서 목록과 다른 분야 링크는 계속 이용할 수 있습니다.</p>}

      <div className="mb-8 rounded-2xl bg-white px-5 py-4 text-sm leading-relaxed text-gray-600 shadow-sm ring-1 ring-gray-100">
        {category.introduction}
      </div>

      <ExploreFeedback status={result.status} retryHref={pagePath} emptyMessage={`${category.label} 분야에 저장된 도서 목록이 없습니다. 다른 분야를 둘러보세요.`} />
      {result.status === 'ready' && <BookGrid
        books={books}
        emptyMessage={`${category.label} 분야에 저장된 도서 목록이 없습니다.`}
      />}

      <nav className="mt-8 flex flex-wrap gap-3 text-sm" aria-label="관련 탐색">
        <Link href="/category" className="rounded-full bg-gray-900 px-4 py-2 font-semibold text-white">
          다른 분야 둘러보기
        </Link>
        <Link href="/popular" className="rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700">
          전체 인기 대출 도서
        </Link>
        <Link href="/libraries" className="rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700">
          우리 동네 도서관 찾기
        </Link>
      </nav>

      <CurationNote items={books} fallback={categories.items.find((item) => item.code === category.kdcCode)} source={`데이터 출처: 도서관 정보나루 인기대출도서 · KDC ${category.kdcCode} · 매일 수집을 시도합니다`} />
    </ExploreShell>
  )
}
