import Link from 'next/link'
import Image from 'next/image'

interface Book {
  isbn: string
  title: string
  author?: string
  coverUrl?: string
}

interface Props {
  title: string
  items: Book[]
  viewAllHref?: string
}

export function BookListSection({ title, items, viewAllHref }: Props) {
  if (!items?.length) return null

  return (
    <section className="px-4 py-12 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors">
            전체 보기 →
          </Link>
        )}
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide md:grid md:grid-cols-5 md:overflow-visible md:mx-0 md:px-0">
        {items.map((book) => (
          <Link 
            key={book.isbn} 
            href={`/book/${book.isbn}`} 
            className="flex-shrink-0 w-36 md:w-auto group"
          >
            <div className="aspect-[2/3] bg-gray-100 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-all relative">
              {book.coverUrl ? (
                <Image 
                  src={book.coverUrl} 
                  alt={book.title} 
                  fill
                  sizes="(max-width: 768px) 144px, 240px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm p-4 text-center">
                  {book.title}
                </div>
              )}
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors">
                {book.title}
              </h3>
              <p className="mt-1 text-xs text-gray-500 truncate">
                {book.author}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
