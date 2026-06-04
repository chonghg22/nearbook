export type LookupType = 'isbn' | 'keyword' | 'lib_book'

export const DedupeKey = {
  isbn(isbn: string): string {
    const normalized = isbn.replace(/[-\s]/g, '').trim()
    return `isbn:${normalized}`
  },
  keyword(keyword: string): string {
    const normalized = keyword.trim().replace(/\s+/g, ' ')
    return `keyword:${normalized}`
  },
  libBook(isbn: string, libCode: string | number): string {
    const normalizedIsbn = isbn.replace(/[-\s]/g, '').trim()
    return `lib_book:${normalizedIsbn}:${String(libCode)}`
  },
}
