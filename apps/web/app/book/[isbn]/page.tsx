import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { WishlistButton } from '@/components/book/wishlist-button'
import { createServerClient } from '@/lib/supabase/server'
import { LibraryStatus } from './_components/library-status'

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:3001'
export const revalidate = 2592000 // 30일
export const dynamicParams = true

async function fetchBook(isbn: string) {
  try {
    // 서버 사이드 기본값은 유지 (검색 엔진용)
    const res = await fetch(`${API_URL}/books/${isbn}/with-libraries?lat=37.5665&lng=126.978`, {
      next: { revalidate },
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error('Error fetching book:', error)
    return null
  }
}

async function fetchWishlistStatus(isbn: string) {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) return false

  try {
    const res = await fetch(`${API_URL}/me/wishlists/${isbn}/status`, {
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

export async function generateStaticParams() {
  try {
    const limit = process.env.NODE_ENV === 'production' ? 5000 : 50
    const res = await fetch(`${API_URL}/books/popular?limit=${limit}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data) ? data : data.data ?? []).map((b: { isbn: string }) => ({
      isbn: b.isbn,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ isbn: string }> }): Promise<Metadata> {
  const { isbn } = await params
  const result = await fetchBook(isbn)
  if (!result) return { title: '책을 찾을 수 없습니다' }
  const book = result.book ?? result

  return {
    title: `${book.title} — ${book.author}`,
    description: `${book.title}을 우리 동네 공공도서관에서 빌릴 수 있는지 확인하세요. ${book.author} · ${book.publisher ?? ''}`,
    openGraph: {
      type: 'book',
      title: book.title,
      description: `${book.author} · ${book.publisher ?? ''}`,
      images: book.coverUrl ? [{ url: book.coverUrl }] : [],
    },
    alternates: { canonical: `https://우리동네책.kr/book/${isbn}` },
  }
}

export default async function BookPage({ params }: { params: Promise<{ isbn: string }> }) {
  const { isbn } = await params
  const [result, isWishlisted] = await Promise.all([
    fetchBook(isbn),
    fetchWishlistStatus(isbn),
  ])
  if (!result) notFound()

  const { book, libraries, affiliates } = result

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Book',
            name: book.title,
            author: { '@type': 'Person', name: book.author },
            isbn: book.isbn,
            publisher: book.publisher,
            datePublished: book.publishedYear,
            image: book.coverUrl,
          }),
        }}
      />

      <main className="bg-canvas min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-12">
          {/* 상단: 책 기본 정보 및 사이드바 */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8 md:gap-12 items-start">
            
            {/* 왼쪽: 책 상세 정보 */}
            <section className="flex flex-col sm:flex-row gap-6 md:gap-8">
              {book.coverUrl && (
                <div className="shrink-0 mx-auto sm:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    width={180}
                    height={270}
                    className="rounded-lg shadow-card-md object-cover border border-border/50"
                  />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight text-balance leading-tight">
                  {book.title}
                </h1>
                <p className="text-lg text-muted-foreground mt-2">{book.author}</p>
                <p className="text-sm text-subtle-foreground mt-2">
                  {book.publisher} {book.publishedYear && `· ${book.publishedYear}`}
                </p>
                
                <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-3">
                  <WishlistButton isbn={book.isbn} initialAdded={isWishlisted} />
                </div>
              </div>
            </section>

            {/* 오른쪽: 사이드바 (데스크톱) */}
            <aside className="hidden md:block">
              <div className="bg-canvas-subtle rounded-xl p-5 border border-border">
                <h3 className="font-semibold text-foreground mb-3 text-sm">도서 정보</h3>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground shrink-0">ISBN</dt>
                    <dd className="font-mono text-foreground break-all text-right">{book.isbn}</dd>
                  </div>
                  {book.publishedYear && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground shrink-0">발행일</dt>
                      <dd className="text-foreground text-right">{book.publishedYear}</dd>
                    </div>
                  )}
                  {book.publisher && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground shrink-0">출판사</dt>
                      <dd className="text-foreground text-right">{book.publisher}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </aside>
          </div>

          {/* 하단: 전체 너비를 사용하는 도서관 목록 섹션 */}
          <div className="space-y-12">
            <LibraryStatus isbn={isbn} initialLibraries={libraries || []} />

            <section>
              <h2 className="text-lg font-bold text-foreground mb-4">🛒 구매·대여 옵션</h2>
              <div className="flex gap-2 flex-wrap">
                {affiliates?.map((a: Record<string, any>) => (
                  <a
                    key={String(a.provider)}
                    href={String(a.url)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium
                                text-muted-foreground hover:border-primary/50 hover:text-primary
                                transition-colors shadow-card"
                  >
                    {String(a.provider)}
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
