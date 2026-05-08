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
  periodKey?: string
  bookCount?: number
}

type Props = {
  searchParams?: Promise<{ libraryId?: string }>
}

async function fetchLibraries(): Promise<LibraryItem[]> {
  const res = await fetch(`${API_URL}/libraries/featured-new-arrivals?limit=12`, { next: { revalidate: 86400 } })
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
  const libraries = await fetchLibraries()
  const selectedLibraryId = libraries.some((library) => String(library.id) === params?.libraryId)
    ? params?.libraryId
    : String(libraries[0]?.id ?? '')
  const books = await fetchNewBooks(selectedLibraryId || undefined)
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
            <p className="mt-1 text-sm text-gray-500">신착도서 데이터가 실제로 준비된 도서관만 우선 노출합니다.</p>
          </div>
          <Link href="/libraries" className="shrink-0 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">
            지도에서 찾기
          </Link>
        </div>
        {libraries.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {libraries.map((library) => {
              const selected = String(library.id) === selectedLibraryId
              return (
                <Link
                  key={library.id}
                  href={`/new-books?libraryId=${library.id}`}
                  className={`rounded-2xl border p-4 transition ${
                    selected
                      ? 'border-primary-500 bg-primary-50 text-primary-900'
                      : 'border-gray-100 bg-gray-50 text-gray-800 hover:border-primary-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold">{library.name}</p>
                    {typeof library.bookCount === 'number' && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${selected ? 'bg-primary-100 text-primary-800' : 'bg-white text-gray-500'}`}>
                        {library.bookCount}권
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500">{library.address ?? library.region}</p>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            아직 준비된 신착도서 큐레이션이 없습니다.
          </div>
        )}
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
