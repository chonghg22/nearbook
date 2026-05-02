import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { LocationMap } from '@/components/library/location-map'

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'
export const revalidate = 60 * 60 * 24 * 7 // 1주

function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  options?: RequestInit,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetchWithTimeout(`${API_URL}/libraries/${id}`, 5000, {
      next: { revalidate },
    })
    if (!res.ok) return { title: '도서관' }
    const { data: lib } = await res.json()
    return {
      title: `${lib.name} 인기도서·신간 | 우리동네책`,
      description: `${lib.name} 인기 대출 도서 TOP 20과 이번 주 신간. ${lib.address}`,
    }
  } catch {
    return { title: '도서관 | 우리동네책' }
  }
}

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [libRes, popularRes, recentRes] = await Promise.allSettled([
    fetchWithTimeout(`${API_URL}/libraries/${id}`, 8000, { next: { revalidate } }),
    fetchWithTimeout(`${API_URL}/libraries/${id}/popular?limit=20`, 8000, { next: { revalidate } }),
    fetchWithTimeout(`${API_URL}/libraries/${id}/recent?limit=20`, 8000, { next: { revalidate } }),
  ])

  if (libRes.status === 'rejected' || !libRes.value.ok) notFound()

  const { data: library } = await libRes.value.json()
  const popular =
    popularRes.status === 'fulfilled' && popularRes.value.ok
      ? (await popularRes.value.json()).data
      : []
  const recent =
    recentRes.status === 'fulfilled' && recentRes.value.ok
      ? (await recentRes.value.json()).data
      : []

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <section className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{library.name}</h1>
            <p className="text-gray-600 text-sm mb-1">{library.address}</p>
            {library.phone && (
              <p className="text-gray-600 text-sm mb-1">{library.phone}</p>
            )}
            {library.operatingHours?.weekday && (
              <p className="text-gray-600 text-sm">
                {library.operatingHours.weekday}
              </p>
            )}
          </div>
          {library.homepage && (
            <a
              href={library.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50"
            >
              홈페이지
            </a>
          )}
        </div>
      </section>

      {/* 인기 대출 도서 */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">
          이 도서관 인기 대출 TOP 20
        </h2>
        {popular.length === 0 ? (
          <p className="text-gray-400 text-sm">인기도서 정보를 불러오는 중입니다.</p>
        ) : (
          <ol className="space-y-2">
            {popular.map((book: any, i: number) => (
              <li key={book.isbn ?? i}>
                <Link
                  href={`/book/${book.isbn}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-400 text-sm w-5 shrink-0">
                    {i + 1}
                  </span>
                  {book.coverUrl && (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      width={36}
                      height={48}
                      className="rounded object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{book.title}</p>
                    <p className="text-gray-500 text-xs truncate">{book.author}</p>
                  </div>
                  {book.loanCount > 0 && (
                    <span className="ml-auto text-xs text-gray-400 shrink-0">
                      {book.loanCount}회
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 신간 */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">최근 30일 신간</h2>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm">신간 정보가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {recent.map((book: any, i: number) => (
              <Link
                key={book.isbn ?? i}
                href={`/book/${book.isbn}`}
                className="group"
              >
                {book.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    width={100}
                    height={140}
                    className="w-full rounded shadow-sm group-hover:shadow-md transition-shadow"
                  />
                ) : (
                  <div className="w-full aspect-[5/7] bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                    표지없음
                  </div>
                )}
                <p className="mt-1 text-xs font-medium line-clamp-2">
                  {book.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{book.author}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 위치 지도 */}
      {library.lat && library.lng && (
        <LocationMap library={library} />
      )}
    </main>
  )
}
