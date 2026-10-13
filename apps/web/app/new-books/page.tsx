import Link from 'next/link'
import type { Metadata } from 'next'
import { BookGrid, ExploreShell } from '../explore/_components/explore-ui'
import { CurationNote, ExploreFeedback } from '../explore/_components/explore-feedback'
import { exploreBooks, exploreLibraries } from '@/lib/explore-data'
import { validLibraryId } from '@/lib/explore-data.mjs'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 0

// libraryId 쿼리로 화면이 바뀌지만 canonical은 항상 쿼리 없는 경로로 고정한다.
// 그렇지 않으면 도서관 수만큼 같은 페이지가 중복 색인된다.
export const metadata: Metadata = buildPageMetadata({
  path: '/new-books',
  title: '도서관 신착도서',
  description:
    '우리 동네 도서관에 새로 들어온 책을 확인하세요. 도서관을 고르면 최근 입고된 신착도서를 바로 볼 수 있습니다.',
})

type Props = {
  searchParams?: Promise<{ libraryId?: string }>
}

export default async function NewBooksPage({ searchParams }: Props) {
  const params = await searchParams
  const requestedId = validLibraryId(params?.libraryId)
  const libraryResult = await exploreLibraries()
  const libraries = libraryResult.items
  const selectedLibraryId = libraries.some((library) => String(library.id) === requestedId)
    ? requestedId
    : String(libraries[0]?.id ?? '')
  const result = selectedLibraryId ? await exploreBooks(`/libraries/${selectedLibraryId}/new-arrivals?limit=40`) : null
  const books = result?.items ?? []
  const selectedLibrary = libraries.find((library) => String(library.id) === selectedLibraryId)
  const retryHref = requestedId ? `/new-books?libraryId=${encodeURIComponent(requestedId)}` : '/new-books'

  return (
    <ExploreShell
      title="도서관 신착도서"
      description="도서관별로 저장된 신착도서 목록입니다. 도서관을 고르고 수집 시점을 함께 확인해 보세요."
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
        ) : <ExploreFeedback status={libraryResult.status} retryHref={retryHref} emptyMessage="저장된 신착도서 목록이 있는 도서관이 없습니다. 지도에서 다른 도서관 정보를 확인해 보세요." />}
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
      {result && <ExploreFeedback status={result.status} retryHref={selectedLibraryId ? `/new-books?libraryId=${selectedLibraryId}` : retryHref} emptyMessage="선택한 도서관에 저장된 신착도서 목록이 없습니다. 다른 도서관을 선택해 보세요." />}
      {result?.status === 'ready' && <BookGrid
        books={books}
        emptyMessage={
          selectedLibraryId
            ? '이 도서관에 저장된 신착도서 목록이 없습니다.'
            : '저장된 신착도서 목록이 있는 도서관이 없습니다.'
        }
      />}
      <CurationNote items={books} fallback={selectedLibrary} source="데이터 출처: 도서관 정보나루 신착도서 · 도서관별로 하루 1회 수집을 시도합니다" />
    </ExploreShell>
  )
}
