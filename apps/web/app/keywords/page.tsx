import Link from 'next/link'
import type { Metadata } from 'next'
import { ExploreShell, SourceNote } from '../explore/_components/explore-ui'

export const revalidate = 3600

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL!

export const metadata: Metadata = {
  title: '이달의 키워드 | 우리동네책',
  description: '도서관 정보나루 월간 키워드를 기반으로 책을 탐색하세요.',
}

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
      title="이달의 키워드"
      description="월 1회 저장된 키워드를 통해 지금 많이 언급되는 작가, 주제, 책을 빠르게 검색할 수 있습니다."
    >
      {keywords.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center text-gray-500">
          저장된 키워드 데이터가 없습니다.
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
      <SourceNote>갱신 주기: 매월 1일 03:30, 데이터 출처: 도서관 정보나루 월간 키워드 API</SourceNote>
    </ExploreShell>
  )
}
