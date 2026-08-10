import Link from 'next/link'
import type { Metadata } from 'next'
import { ExploreShell, SourceNote } from '../explore/_components/explore-ui'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 3600

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL!

const PAGE_PATH = '/keywords'
const PAGE_TITLE = '이달의 도서 키워드'

export const metadata: Metadata = buildPageMetadata({
  path: PAGE_PATH,
  title: PAGE_TITLE,
  description:
    '이번 달 도서관에서 사람들이 가장 많이 찾은 키워드입니다. 관심 가는 작가나 주제를 눌러 관련 도서를 바로 찾아보세요.',
})

type Keyword = {
  word: string
  weight: number
}

async function fetchKeywords(): Promise<Keyword[]> {
  const res = await fetch(`${API_URL}/search/monthly-keywords?limit=10`, { next: { revalidate: 3600 } })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export default async function KeywordsPage() {
  const keywords = await fetchKeywords()

  return (
    <ExploreShell
      title={PAGE_TITLE}
      description="이번 달 도서관 이용자들이 가장 많이 찾은 작가와 주제입니다. 키워드를 누르면 관련 도서를 바로 검색합니다."
    >
      {keywords.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center text-gray-500">
          이달의 키워드를 준비하고 있습니다. 잠시 후 다시 확인해 주세요.
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {keywords.map((keyword, index) => (
            <Link
              key={keyword.word}
              href={`/search?q=${encodeURIComponent(keyword.word)}`}
              className="rounded-full border border-primary-100 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300 hover:text-primary-700 hover:shadow-md"
            >
              <span className="mr-2 text-primary-600">#{index + 1}</span>
              {keyword.word}
            </Link>
          ))}
        </div>
      )}

      <nav className="mt-8 flex flex-wrap gap-3 text-sm" aria-label="관련 탐색">
        <Link href="/popular" className="rounded-full bg-gray-900 px-4 py-2 font-semibold text-white">
          인기 대출 도서 보기
        </Link>
        <Link href="/rising" className="rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700">
          대출 급상승 도서 보기
        </Link>
        <Link href="/category" className="rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700">
          분야별로 찾기
        </Link>
      </nav>

      <SourceNote>데이터 출처: 도서관 정보나루 이달의 키워드 · 매월 갱신</SourceNote>
    </ExploreShell>
  )
}
