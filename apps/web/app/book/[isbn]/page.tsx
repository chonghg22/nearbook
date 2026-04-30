import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:3001'
export const revalidate = 2592000 // 30일
export const dynamicParams = true

async function fetchBook(isbn: string) {
  try {
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
  const result = await fetchBook(isbn)
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <section className="flex gap-6 mb-8">
          {book.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt={book.title}
              width={120}
              height={180}
              className="rounded shadow-md object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            <p className="text-gray-500 mt-1">{book.author}</p>
            <p className="text-gray-400 text-sm mt-1">
              {book.publisher} {book.publishedYear && `· ${book.publishedYear}`}
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">📚 주변 도서관 보유 현황</h2>
          {libraries?.length ? (
            <ul className="space-y-2">
              {libraries.map((lib: Record<string, any>) => (
                <li key={String(lib.id)} className="border rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{String(lib.name ?? '')}</p>
                    <p className="text-sm text-gray-400">
                      {lib.distanceKm}km · {String(lib.address ?? '')}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${lib.loanAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                    {lib.loanAvailable ? '✅ 대출 가능' : '⏳ 대출 중'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">반경 5km 내 도서관 정보가 없습니다.</p>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">🛒 구매·대여 옵션</h2>
          <div className="flex gap-3 flex-wrap">
            {affiliates?.map((a: Record<string, any>) => (
              <a
                key={String(a.provider)}
                href={String(a.url)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition"
              >
                {String(a.provider)} ({String(a.type)})
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
