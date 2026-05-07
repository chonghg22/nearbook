import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { LocationMap } from '@/components/library/location-map'
import { LibraryFavoriteButton } from '@/components/library/library-favorite-button'
import { BookCard } from '@/components/book/book-card'
import { createServerClient } from '@/lib/supabase/server'

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'
export const revalidate = 604800 // 1주

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

async function fetchLibraryFavoriteStatus(libraryId: string) {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) return false

  try {
    const res = await fetchWithTimeout(`${API_URL}/me/library-cards/${libraryId}/status`, 5000, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })

    if (!res.ok) return false

    const json = await res.json()
    return Boolean(json.data?.added)
  } catch {
    return false
  }
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

  const [libRes, popularRes, recentRes, isFavorite] = await Promise.allSettled([
    fetchWithTimeout(`${API_URL}/libraries/${id}`, 8000, { next: { revalidate } }),
    fetchWithTimeout(`${API_URL}/libraries/${id}/popular?limit=20`, 8000, { next: { revalidate } }),
    fetchWithTimeout(`${API_URL}/libraries/${id}/recent?limit=20`, 8000, { next: { revalidate } }),
    fetchLibraryFavoriteStatus(id),
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
  const initialFavorite = isFavorite.status === 'fulfilled' ? isFavorite.value : false

  return (
    <main className="bg-canvas min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* 헤더 */}
        <section className="mb-10 bg-white rounded-2xl p-6 md:p-8 border border-border shadow-card">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{library.name}</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {library.address}
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {library.phone && (
                  <div className="flex justify-between text-xs py-1 border-b border-border/50">
                    <span className="text-subtle-foreground">전화번호</span>
                    <span className="text-foreground font-medium">{library.phone}</span>
                  </div>
                )}
                {library.operatingHours?.weekday && (
                  <div className="flex justify-between text-xs py-1 border-b border-border/50">
                    <span className="text-subtle-foreground">운영시간</span>
                    <span className="text-foreground font-medium">{library.operatingHours.weekday}</span>
                  </div>
                )}
              </div>
            </div>
            {library.homepage && (
              <a
                href={library.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center justify-center h-10 px-6 rounded-full
                           bg-primary text-white text-sm font-semibold hover:bg-primary-600 transition-colors shadow-card"
              >
                도서관 홈페이지 방문
              </a>
            )}
          </div>
          <div className="mt-4">
            <LibraryFavoriteButton
              libraryId={library.id}
              initialAdded={initialFavorite}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-12">
            {/* 인기 대출 도서 */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="text-primary text-xl">🏆</span> 인기도서 TOP 20
                </h2>
              </div>
              {popular.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-border border-dashed">
                  <p className="text-muted-foreground text-sm">인기도서 정보를 불러오는 중입니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {popular.map((book: any, i: number) => (
                    <div key={book.isbn ?? i} className="relative">
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-canvas-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground z-10 shadow-sm">
                        {i + 1}
                      </div>
                      <BookCard
                        isbn={book.isbn}
                        title={book.title}
                        author={book.author}
                        coverUrl={book.coverUrl}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 신간 */}
            <section>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary text-xl">✨</span> 최근 30일 신간
              </h2>
              {recent.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-border border-dashed">
                  <p className="text-muted-foreground text-sm">신간 정보가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {recent.map((book: any, i: number) => (
                    <Link
                      key={book.isbn ?? i}
                      href={`/book/${book.isbn}`}
                      className="group"
                    >
                      <div className="aspect-[2/3] relative rounded-lg overflow-hidden border border-border shadow-card group-hover:shadow-card-hover transition-all duration-300">
                        {book.coverUrl ? (
                          <Image
                            src={book.coverUrl}
                            alt={book.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-canvas-muted flex items-center justify-center text-subtle-foreground text-xs">
                            표지없음
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {book.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{book.author}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* 사이드바 */}
          <aside className="space-y-8">
            {/* 위치 지도 */}
            {library.lat && library.lng && (
              <div className="rounded-2xl overflow-hidden border border-border shadow-card">
                <div className="px-4 py-3 bg-white border-b border-border">
                  <h3 className="text-sm font-bold text-foreground">도서관 위치</h3>
                </div>
                <div className="h-60 grayscale-[0.5]">
                  <LocationMap library={library} />
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
