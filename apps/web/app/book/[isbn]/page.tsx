import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BookCard } from '@/components/book/book-card'
import { WishlistButton } from '@/components/book/wishlist-button'
import { AffiliateOptions } from '@/components/book/affiliate-options'
import { AdSenseSlot } from '@/components/ads/adsense-slot'
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

async function fetchAnalysis(isbn: string) {
  try {
    const res = await fetch(`${API_URL}/books/${isbn}/analysis`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch (error) {
    console.error('Error fetching book analysis:', error)
    return null
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
  const [result, analysis] = await Promise.all([
    fetchBook(isbn),
    fetchAnalysis(isbn),
  ])
  if (!result) notFound()

  const { book, libraries } = result
  const hasAnalysis =
    analysis &&
    (
      analysis.keywords?.length ||
      analysis.loanHistory?.length ||
      analysis.loanGroups?.length ||
      analysis.coLoanBooks?.length ||
      analysis.maniaRecBooks?.length ||
      analysis.readerRecBooks?.length
    )

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
                  <WishlistButton isbn={book.isbn} />
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

            {hasAnalysis && (
              <BookAnalysisSection analysis={analysis} />
            )}

            <AdSenseSlot
              slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOOK_INLINE}
              label="도서 상세 중간 광고"
              className="px-0"
            />

            <section>
              <h2 className="text-lg font-bold text-foreground mb-4">🛒 구매·대여 옵션</h2>
              <AffiliateOptions isbn={isbn} />
            </section>
          </div>
        </div>
      </main>
    </>
  )
}

function BookAnalysisSection({ analysis }: { analysis: any }) {
  const maxLoanCount = Math.max(
    1,
    ...(analysis.loanHistory ?? []).map((item: any) => Number(item.loanCount ?? 0)),
  )

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-2">📊 이 책의 이용 분석</h2>
        <p className="text-sm text-muted-foreground">
          도서관 정보나루의 대출 빅데이터를 바탕으로 최근 대출 흐름과 함께 읽힌 책을 보여드립니다.
        </p>
      </div>

      {analysis.keywords?.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">핵심 키워드</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.keywords.slice(0, 12).map((keyword: any) => (
              <span
                key={keyword.word}
                className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
              >
                {keyword.word}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {analysis.loanHistory?.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">최근 12개월 대출 추이</h3>
            <div className="space-y-2">
              {analysis.loanHistory.slice(-6).map((item: any) => (
                <div key={item.month} className="grid grid-cols-[64px_1fr_56px] items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{item.month}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${Math.max(6, (Number(item.loanCount) / maxLoanCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right font-medium text-foreground">{Number(item.loanCount).toLocaleString()}회</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.loanGroups?.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">많이 읽는 독자층</h3>
            <div className="space-y-2">
              {analysis.loanGroups.slice(0, 5).map((group: any, index: number) => (
                <div key={`${group.age}-${group.gender}-${index}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                  <span className="font-medium text-foreground">
                    {[group.age, group.gender].filter(Boolean).join(' · ')}
                  </span>
                  <span className="text-muted-foreground">
                    {Number(group.loanCount).toLocaleString()}회 · {group.ranking ? `${group.ranking}위` : '순위 없음'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <RelatedBooks title="함께 대출된 책" books={analysis.coLoanBooks ?? []} />
      <RelatedBooks title="이 책을 좋아한 사람이 읽은 책" books={analysis.maniaRecBooks ?? []} />
      <RelatedBooks title="다독자들이 함께 읽은 책" books={analysis.readerRecBooks ?? []} />
    </section>
  )
}

function RelatedBooks({ title, books }: { title: string; books: any[] }) {
  if (!books.length) return null

  return (
    <section>
      <h3 className="text-base font-bold text-foreground mb-3">{title}</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {books.slice(0, 6).map((book) => (
          <BookCard
            key={book.isbn}
            isbn={book.isbn}
            title={book.title}
            author={book.author ?? ''}
            publisher={book.publisher ?? undefined}
            coverUrl={book.coverUrl ?? undefined}
          />
        ))}
      </div>
    </section>
  )
}
