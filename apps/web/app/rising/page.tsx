import type { Metadata } from 'next'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../explore/_components/explore-ui'
import { SERVER_API_BASE_URL } from '@/lib/constants'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBookListJsonLd } from '@/lib/seo/json-ld'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 3600

const API_URL = SERVER_API_BASE_URL

const PAGE_PATH = '/rising'
const PAGE_TITLE = '대출 급상승 도서'
const PAGE_DESCRIPTION =
  '최근 도서관 대출 순위가 빠르게 오른 책입니다. 요즘 사람들이 새로 찾기 시작한 책을 먼저 만나보세요.'

export const metadata: Metadata = buildPageMetadata({
  path: PAGE_PATH,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
})

async function fetchRisingBooks(): Promise<ExploreBook[]> {
  const res = await fetch(`${API_URL}/books/hot-trend?limit=20`, { next: { revalidate: 3600 } })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export default async function RisingPage() {
  const books = await fetchRisingBooks()

  return (
    <ExploreShell
      title={PAGE_TITLE}
      description="지난주보다 대출이 크게 늘어난 책을 모았습니다. 화제가 되기 시작한 책을 남들보다 먼저 빌려 읽어보세요."
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
        emptyMessage="급상승 도서를 집계하고 있습니다. 잠시 후 다시 확인해 주세요."
      />

      <SourceNote>데이터 출처: 도서관 정보나루 대출 급상승 도서 · 매일 갱신</SourceNote>
    </ExploreShell>
  )
}
