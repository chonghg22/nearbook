import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { LocationMap } from '@/components/library/location-map'
import { LibraryFavoriteButton } from '@/components/library/library-favorite-button'
import { BookCard } from '@/components/book/book-card'
import { createServerClient } from '@/lib/supabase/server'
import { SERVER_API_BASE_URL } from '@/lib/constants'

const API_URL = SERVER_API_BASE_URL
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

  const [libRes, popularRes, newArrivalRes, trendRes, isFavorite] = await Promise.allSettled([
    fetchWithTimeout(`${API_URL}/libraries/${id}`, 8000, { next: { revalidate } }),
    fetchWithTimeout(`${API_URL}/libraries/${id}/popular?limit=20`, 8000, { next: { revalidate } }),
    fetchWithTimeout(`${API_URL}/libraries/${id}/new-arrivals?limit=20`, 8000, { next: { revalidate } }),
    fetchWithTimeout(`${API_URL}/libraries/${id}/trends`, 8000, { next: { revalidate } }),
    fetchLibraryFavoriteStatus(id),
  ])

  if (libRes.status === 'rejected' || !libRes.value.ok) notFound()

  const { data: library } = await libRes.value.json()
  const popular =
    popularRes.status === 'fulfilled' && popularRes.value.ok
      ? (await popularRes.value.json()).data
      : []
  const newArrivals =
    newArrivalRes.status === 'fulfilled' && newArrivalRes.value.ok
      ? (await newArrivalRes.value.json()).data
      : []
  const trends =
    trendRes.status === 'fulfilled' && trendRes.value.ok
      ? (await trendRes.value.json()).data
      : []
  const initialFavorite = isFavorite.status === 'fulfilled' ? isFavorite.value : false

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* 헤더 */}
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-border bg-white p-6 shadow-card md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="mb-3 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                공공도서관 상세
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{library.name}</h1>
              <p className="text-muted-foreground text-sm flex items-start gap-1.5 leading-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {library.address}
              </p>
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-8">
                {library.phone && (
                  <div className="flex justify-between gap-4 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                    <span className="text-subtle-foreground">전화번호</span>
                    <span className="text-right font-medium text-foreground">{library.phone}</span>
                  </div>
                )}
                {library.operatingHours?.weekday && (
                  <div className="flex justify-between gap-4 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                    <span className="text-subtle-foreground">운영시간</span>
                    <span className="text-right font-medium text-foreground">{library.operatingHours.weekday}</span>
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
          <div className="mt-5">
            <LibraryFavoriteButton
              libraryId={library.id}
              initialAdded={initialFavorite}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-12">
            {/* 인기 대출 도서 */}
            <section className="rounded-[1.5rem] border border-border bg-white p-5 shadow-card md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="text-primary text-xl">🏆</span> 인기도서 TOP 20
                </h2>
              </div>
              {popular.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-canvas/70 p-10 text-center">
                  <p className="text-muted-foreground text-sm">인기도서 정보가 없습니다.</p>
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

            {/* 신착도서 */}
            <section className="rounded-[1.5rem] border border-border bg-white p-5 shadow-card md:p-6">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-primary text-xl">✨</span> 새로 들어온 책
              </h2>
              {newArrivals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-canvas/70 p-10 text-center">
                  <p className="text-muted-foreground text-sm">신착도서 정보가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {newArrivals.map((book: any, i: number) => (
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
                      {book.registeredAt && (
                        <p className="mt-0.5 text-[10px] text-subtle-foreground">{book.registeredAt} 등록</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* 사이드바 */}
          <aside className="flex h-full flex-col gap-6 lg:self-stretch">
            <LibraryTrendCard trends={trends} />

            {/* 위치 지도 */}
            {library.lat && library.lng && (
              <section className="flex min-h-[430px] flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-card">
                <div className="px-4 py-3 bg-white border-b border-border">
                  <h3 className="text-sm font-bold text-foreground">🗺 도서관 위치</h3>
                </div>
                <div className="min-h-0 flex-1">
                  <LocationMap library={library} />
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}

function LibraryTrendCard({ trends }: { trends: any }) {
  const dayRows = trends?.dayOfWeek ?? []
  const hourRows = trends?.hours ?? []
  if (!dayRows.length && !hourRows.length) return null

  const busiestDay = [...dayRows].sort((a: any, b: any) => Number(b.loan) - Number(a.loan))[0]
  const busiestHour = [...hourRows].sort((a: any, b: any) => Number(b.loan) - Number(a.loan))[0]

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-card">
      <h3 className="text-sm font-bold text-foreground">대출·반납 이용 패턴</h3>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        최근 30일 대출·반납량을 상대 비율로 보여드립니다.
      </p>

      <div className="mt-4 space-y-3">
        {busiestDay && (
          <div className="rounded-lg bg-primary-50 px-3 py-2">
            <p className="text-[11px] text-primary-700">대출이 많은 요일</p>
            <p className="mt-0.5 text-sm font-semibold text-primary-900">
              {formatDayOfWeek(busiestDay.dayOfWeek)} · {Math.round(Number(busiestDay.loan))}%
            </p>
          </div>
        )}
        {busiestHour && (
          <div className="rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-[11px] text-amber-700">대출이 많은 시간대</p>
            <p className="mt-0.5 text-sm font-semibold text-amber-900">
              {formatHour(busiestHour.hour)} · {Math.round(Number(busiestHour.loan))}%
            </p>
          </div>
        )}
      </div>

      {dayRows.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold text-foreground">요일별 대출 비율</p>
          {dayRows.map((row: any) => (
            <div key={row.dayOfWeek} className="grid grid-cols-[44px_1fr_40px] items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">{formatDayOfWeek(row.dayOfWeek)}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${Math.max(4, Number(row.loan))}%` }}
                />
              </div>
              <span className="text-right text-foreground">{Math.round(Number(row.loan))}%</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function formatDayOfWeek(day: string | null) {
  const map: Record<string, string> = {
    Sunday: '일',
    Monday: '월',
    Tuesday: '화',
    Wednesday: '수',
    Thursday: '목',
    Friday: '금',
    Saturday: '토',
  }
  return day ? map[day] ?? day : '-'
}

function formatHour(hour: string | null) {
  if (!hour) return '-'
  if (hour === '00') return '0~9시'
  if (hour === '20') return '20~23시'
  return `${hour}시`
}
