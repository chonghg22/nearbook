import type { Metadata } from 'next'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../explore/_components/explore-ui'
import { SERVER_API_BASE_URL } from '@/lib/constants'

export const revalidate = 3600

const API_URL = SERVER_API_BASE_URL

export const metadata: Metadata = {
  title: '대출 급상승 도서 | 우리동네책',
  description: '최근 대출 순위가 빠르게 오른 도서를 확인하세요.',
}

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
      title="대출 급상승 도서"
      description="정보나루 타임아웃과 호출 한도 영향을 줄이기 위해 매일 저장된 급상승 도서만 보여줍니다."
    >
      <BookGrid books={books} emptyMessage="저장된 대출 급상승 도서 데이터가 없습니다." />
      <SourceNote>갱신 주기: 매일 03:20, 데이터 출처: 도서관 정보나루 대출 급상승 도서 API</SourceNote>
    </ExploreShell>
  )
}
