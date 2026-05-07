import Link from 'next/link'
import type { Metadata } from 'next'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../explore/_components/explore-ui'

export const revalidate = 3600

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL!

export const metadata: Metadata = {
  title: '새로 들어온 책 | 우리동네책',
  description: '도서관을 선택하고 해당 도서관의 신착도서를 확인하세요.',
}

type LibraryItem = {
  id: number
  name: string
  address?: string
  region?: string
}

type Props = {
  searchParams?: Promise<{ libraryId?: string }>
}

async function fetchLibraries(): Promise<LibraryItem[]> {
  const res = await fetch(`${API_URL}/libraries/popular?limit=12`, { next: { revalidate: 86400 } })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

async function fetchNewBooks(libraryId?: string): Promise<ExploreBook[]> {
  if (!libraryId) return []
  const res = await fetch(`${API_URL}/libraries/${libraryId}/new-arrivals?limit=40`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export default async function NewBooksPage({ searchParams }: Props) {
  const params = await searchParams
  const selectedLibraryId = params?.libraryId
  const [libraries, books] = await Promise.all([fetchLibraries(), fetchNewBooks(selectedLibraryId)])
  const selectedLibrary = libraries.find((library) => String(library.id) === selectedLibraryId)

  return (
    <ExploreShell
      title="새로 들어온 책"
      description="신착도서는 지역/도서관 조건이 필요한 데이터라서 먼저 도서관을 선택한 뒤 해당 도서관 기준으로 보여줍니다."
    >
      <section className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">도서관 선택</h2>
            <p className="mt-1 text-sm text-gray-500">현재는 대표 도서관 목록에서 선택하고, 이후 지역 필터와 연결하면 됩니다.</p>
          </div>
          <Link href="/libraries" className="shrink-0 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">
            지도에서 찾기
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {libraries.map((library) => {
            const selected = String(library.id) === selectedLibraryId
            return (
              <Link
                key={library.id}
                href={`/new-books?libraryId=${library.id}`}
                className={`rounded-2xl border p-4 transition ${
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-100 bg-gray-50 text-gray-800 hover:border-blue-200 hover:bg-white'
                }`}
              >
                <p className="font-bold">{library.name}</p>
                <p className="mt-1 line-clamp-1 text-xs text-gray-500">{library.address ?? library.region}</p>
              </Link>
            )
          })}
        </div>
      </section>

      {selectedLibrary && (
        <h2 className="mb-4 text-xl font-black text-gray-900">{selectedLibrary.name} 신착도서</h2>
      )}
      <BookGrid
        books={books}
        emptyMessage={selectedLibraryId ? '이 도서관의 신착도서 데이터가 없습니다.' : '먼저 도서관을 선택해주세요.'}
      />
      <SourceNote>
        갱신 권장: 도서관별 신착도서는 지역/도서관 조건이 필요하므로 인기 도서관 또는 사용자가 자주 보는 도서관 기준으로 하루 1회 저장하는 방식이 적합합니다.
      </SourceNote>
    </ExploreShell>
  )
}
