import type { Metadata } from 'next'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../explore/_components/explore-ui'
import { SERVER_API_BASE_URL } from '@/lib/constants'

export const revalidate = 3600

const API_URL = SERVER_API_BASE_URL

export const metadata: Metadata = {
  title: '인기도서 | 우리동네책',
  description: '도서관 정보나루 데이터를 기반으로 저장된 인기 도서를 확인하세요.',
}

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
      title="인기도서"
      description="누구에게나 동일하게 제공되는 인기대출도서는 매일 새벽 DB에 저장한 뒤 화면에서는 저장된 값만 읽습니다."
    >
      <BookGrid books={books} emptyMessage="저장된 인기도서 데이터가 없습니다. 다음 갱신 이후 다시 확인해주세요." />
      <SourceNote>갱신 주기: 매일 03:10, 데이터 출처: 도서관 정보나루 인기대출도서 API</SourceNote>
    </ExploreShell>
  )
}
