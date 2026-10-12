import { cache } from 'react'
import type { Book } from '@nearbook/shared-types'
import { SERVER_API_BASE_URL } from './server-api'
import { DetailRequestError, requestDetail } from './detail-request.mjs'

// React cache only deduplicates metadata/page reads within the same server render.
// Backend metadata caching remains separate from live, location-dependent holdings.
export const fetchBookDetail = cache(async (isbn: string): Promise<Book | null> => {
  const json = await requestDetail(`${SERVER_API_BASE_URL}/books/${encodeURIComponent(isbn)}`)
  if (json === null) return null
  if (typeof json !== 'object' || Array.isArray(json)) throw new DetailRequestError('invalid-response')
  const book = json as Partial<Book>
  if (typeof book.isbn !== 'string' || !book.isbn || typeof book.title !== 'string' || !book.title.trim()) {
    throw new DetailRequestError('invalid-response')
  }
  return book as Book
})

export type LibraryDetail = {
  id: number
  name: string
  address: string
  region: string
  lat: number
  lng: number
  phone?: string | null
  homepage?: string | null
  operatingHours?: { weekday?: string; text?: string; closed?: string } | null
}

export const fetchLibraryDetail = cache(async (id: string): Promise<LibraryDetail | null> => {
  const json = await requestDetail(`${SERVER_API_BASE_URL}/libraries/${encodeURIComponent(id)}`)
  if (json === null) return null
  if (typeof json !== 'object' || Array.isArray(json)) throw new DetailRequestError('invalid-response')
  const library = (json as { data?: Partial<LibraryDetail> }).data
  if (!library || !Number.isInteger(library.id) || typeof library.name !== 'string' || !library.name.trim()) {
    throw new DetailRequestError('invalid-response')
  }
  return library as LibraryDetail
})

// Supplementary sections fail independently, including malformed JSON.
export async function fetchOptionalDetail<T>(path: string): Promise<T | null> {
  try {
    const json = await requestDetail(`${SERVER_API_BASE_URL}${path}`)
    if (json === null || typeof json !== 'object' || !('data' in json)) return null
    return json.data as T
  } catch {
    return null
  }
}
