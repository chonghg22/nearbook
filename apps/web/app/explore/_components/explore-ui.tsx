import Image from 'next/image'
import Link from 'next/link'

export type ExploreBook = {
  isbn: string
  title: string
  author?: string | null
  publisher?: string | null
  coverUrl?: string | null
  loanCount?: number | null
  difference?: number | null
  category?: string | null
}

export function ExploreShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 rounded-[2rem] bg-gradient-to-br from-primary-900 via-primary-700 to-primary px-6 py-8 text-white shadow-sm md:px-10">
        <p className="mb-3 text-sm font-semibold text-primary-100">탐색</p>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">{description}</p>
      </header>
      {children}
    </main>
  )
}

export function BookGrid({ books, emptyMessage }: { books: ExploreBook[]; emptyMessage: string }) {
  if (!books.length) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {books.map((book, index) => (
        <Link key={`${book.isbn}-${index}`} href={`/book/${book.isbn}`} className="group">
          <article className="h-full rounded-3xl border border-gray-100 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-gray-100">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={`${book.title} 표지`}
                  fill
                  sizes="(max-width: 768px) 50vw, 20vw"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
                  {book.title}
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 group-hover:text-primary-700">
                {book.title}
              </p>
              <p className="mt-1 truncate text-xs text-gray-500">{book.author || '저자 정보 없음'}</p>
              <BookMeta book={book} />
            </div>
          </article>
        </Link>
      ))}
    </div>
  )
}

function BookMeta({ book }: { book: ExploreBook }) {
  if (typeof book.loanCount === 'number') {
    return <p className="mt-2 text-xs font-semibold text-primary-700">대출 {book.loanCount.toLocaleString()}회</p>
  }
  if (typeof book.difference === 'number') {
    return <p className="mt-2 text-xs font-semibold text-red-600">상승 {book.difference.toLocaleString()}</p>
  }
  if (book.category) {
    return <p className="mt-2 truncate text-xs text-gray-400">{book.category}</p>
  }
  return null
}

export function SourceNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 rounded-2xl bg-primary-50 px-4 py-3 text-sm leading-6 text-primary-900">
      {children}
    </p>
  )
}
