import type { Metadata } from 'next'
import { BookGrid, ExploreShell } from '../explore/_components/explore-ui'
import { CurationNote, ExploreFeedback } from '../explore/_components/explore-feedback'
import { exploreBooks } from '@/lib/explore-data'
import { JsonLd } from '@/components/seo/json-ld'
import { buildBookListJsonLd } from '@/lib/seo/json-ld'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 0

const PAGE_PATH = '/popular'
const PAGE_TITLE = '도서관 인기 대출 도서'
const PAGE_DESCRIPTION =
  '저장된 전국 공공도서관 대출 기록을 기반으로 인기 도서를 확인하세요. 수집 시점과 함께 우리 동네 도서관의 보유 여부를 찾아볼 수 있습니다.'

export const metadata: Metadata = buildPageMetadata({
  path: PAGE_PATH,
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
})

export default async function PopularPage() {
  const result = await exploreBooks('/books/loan-item?limit=20')
  const books = result.items

  return (
    <ExploreShell
      title={PAGE_TITLE}
      description="저장된 도서관 대출 기록을 기반으로 한 목록입니다. 수집 시점을 확인하고 마음에 드는 책을 우리 동네 도서관에서 찾아보세요."
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

      <ExploreFeedback status={result.status} retryHref="/popular" emptyMessage="저장된 인기 대출 도서 목록이 없습니다." />
      {result.status === 'ready' && <BookGrid
        books={books}
        emptyMessage="저장된 인기 대출 도서 목록이 없습니다."
      />}

      <CurationNote items={books} source="데이터 출처: 도서관 정보나루 인기대출도서 · 매일 수집을 시도합니다" />
    </ExploreShell>
  )
}
