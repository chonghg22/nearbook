import {
  authorNames,
  normalizeSearchText,
  searchEditionLabels,
  type SearchType,
} from '@nearbook/shared-types'

interface RankedBook {
  isbn: string
  title: string
  author?: string
  publisher?: string
}

export function bookMatchRank(book: RankedBook, query: string, type: SearchType): number {
  const q = normalizeSearchText(query)
  const match = (value: string) => {
    const normalized = normalizeSearchText(value)
    return normalized === q ? 0 : normalized.includes(q) ? 1 : 2
  }
  if (type === 'isbn') return 0
  if (type === 'author') return match(authorNames(book.author ?? ''))
  if (type === 'publisher') return match(book.publisher ?? '')
  const title = match(book.title)
  // Exact title, whole phrase, then partial token matches; never rerank just one page.
  const penalty =
    !searchEditionLabels(query).length && searchEditionLabels(book.title).length ? 1 : 0
  if (title < 2) return title * 2 + penalty
  if (type === 'title') return 4
  const author = match(authorNames(book.author ?? ''))
  if (author < 2) return 4 + author
  const publisher = match(book.publisher ?? '')
  return publisher < 2 ? 6 + publisher : 8
}
