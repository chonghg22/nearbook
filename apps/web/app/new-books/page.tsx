import Link from 'next/link'
import type { Metadata } from 'next'
import { BookGrid, ExploreShell, SourceNote, type ExploreBook } from '../explore/_components/explore-ui'
import { SERVER_API_BASE_URL } from '@/lib/constants'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 3600

const API_URL = SERVER_API_BASE_URL

// libraryId 쿼리로 화면이 바뀌지만 canonical은 항상 쿼리 없는 경로로 고정한다.
// 그렇지 않으면 도서관 수만큼 같은 페이지가 중복 색인된다.
export const metadata: Metadata = buildPageMetadata({
  path: '/new-books',
  title: '도서관 신착도서',
  description:
    '우리 동네 도서관에 새로 들어온 책을 확인하세요. 도서관을 고르면 최근 입고된 신착도서를 바로 볼 수 있습니다.',
})

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
      title="도서관 신착도서"
      description="우리 동네 도서관에 이번에 새로 들어온 책입니다. 도서관을 고르면 최근 입고된 책을 바로 볼 수 있습니다."
    >
      <section className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">도서관 선택</h2>
            <p className="mt-1 text-sm text-gray-500">신착도서를 바로 볼 수 있는 도서관을 먼저 보여드립니다.</p>
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
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-black text-gray-900">{selectedLibrary.name} 신착도서</h2>
          <Link
            href={`/library/${selectedLibrary.id}`}
            className="text-sm font-semibold text-primary-700 hover:underline"
          >
            {selectedLibrary.name} 도서관 정보 보기 →
          </Link>
        </div>
      )}
      <BookGrid
        books={books}
        emptyMessage={
          selectedLibraryId
            ? '이 도서관의 신착도서를 준비하고 있습니다. 다른 도서관을 선택해 보세요.'
            : '먼저 도서관을 선택해주세요.'
        }
      />
      <SourceNote>데이터 출처: 도서관 정보나루 신착도서 · 도서관별로 하루 1회 갱신</SourceNote>
    </ExploreShell>
  )
}
