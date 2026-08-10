import type { Metadata } from 'next'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../explore/_components/explore-ui'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBookListJsonLd } from '@/lib/seo/json-ld'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 3600

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL!

const PAGE_PATH = '/popular'
const PAGE_TITLE = '도서관 인기 대출 도서'
const PAGE_DESCRIPTION =
  '전국 공공도서관에서 지금 가장 많이 빌려 간 책을 모았습니다. 서점 판매 순위가 아니라 실제 대출 기록을 기준으로 한 순위입니다.'

export const metadata: Metadata = buildPageMetadata({
  path: PAGE_PATH,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
})

async function fetchPopularBooks(): Promise<ExploreBook[]> {
  const res = await fetch(`${API_URL}/books/loan-item?limit=20`, { next: { revalidate: 3600 } })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export default async function PopularPage() {
  const books = await fetchPopularBooks()

  return (
    <ExploreShell
      title={PAGE_TITLE}
      description="지금 도서관에서 가장 많이 빌려 가는 책입니다. 마음에 드는 책을 고른 뒤 우리 동네 도서관에 있는지 바로 확인해 보세요."
    >
      <JsonLd
        data={buildBookListJsonLd({
          path: PAGE_PATH,
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          books,
          breadcrumbs: [
            { name: '홈', path: '/' },
            { name: PAGE_TITLE, path: PAGE_PATH },
          ],
        })}
      />

      <BookGrid
        books={books}
        emptyMessage="인기 대출 도서를 준비하고 있습니다. 잠시 후 다시 확인해 주세요."
      />

      <SourceNote>데이터 출처: 도서관 정보나루 인기대출도서 · 매일 갱신</SourceNote>
    </ExploreShell>
  )
}
