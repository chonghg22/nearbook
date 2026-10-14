import type {
  ApiResponse,
  Library,
  LibraryOperatingHours,
  SearchBook,
  SearchResult,
} from '@nearbook/shared-types'
import { ApiRequestError } from './api-request.mjs'
import { parseLibraryList } from './map-libraries.mjs'

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiRequestError('invalid-response')
  return value as Record<string, unknown>
}
function requiredText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiRequestError('invalid-response')
  return value.trim()
}
function nullableText(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new ApiRequestError('invalid-response')
  return value
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new ApiRequestError('invalid-response')
  return value
}
function isbn(value: unknown): string {
  const text = requiredText(value)
  if (!/^(?:\d{13}|\d{9}[\dXx])$/.test(text)) throw new ApiRequestError('invalid-response')
  return text
}
function httpUrl(value: unknown): string | null {
  const text = nullableText(value)
  if (text === null) return null
  try {
    const url = new URL(text)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}
function searchBook(value: unknown): SearchBook {
  const row = object(value)
  return {
    isbn: isbn(row.isbn),
    title: requiredText(row.title),
    author: nullableText(row.author),
    publisher: nullableText(row.publisher),
    coverUrl: httpUrl(row.coverUrl),
  }
}
export function parseSearchResult(value: unknown): ApiResponse<SearchResult> {
  const row = object(object(value).data)
  if (!Array.isArray(row.items) || row.items.length > 100)
    throw new ApiRequestError('invalid-response')
  const items = row.items.map(searchBook)
  const total = count(row.total),
    page = count(row.page),
    pageSize = count(row.pageSize)
  if (page < 1 || pageSize < 1 || pageSize > 100 || items.length > pageSize || total < items.length)
    throw new ApiRequestError('invalid-response')
  const strings = (value: unknown): string[] | undefined => {
    if (value === undefined) return undefined
    if (!Array.isArray(value) || value.length > 100) throw new ApiRequestError('invalid-response')
    return value.map(requiredText)
  }
  const durationMs = row.durationMs === undefined ? undefined : count(row.durationMs)
  return {
    data: {
      items,
      total,
      page,
      pageSize,
      ...(durationMs === undefined ? {} : { durationMs }),
      ...(row.suggestions === undefined ? {} : { suggestions: strings(row.suggestions)! }),
      ...(row.trending === undefined ? {} : { trending: strings(row.trending)! }),
    },
  }
}
export function parseSuggestions(value: unknown): ApiResponse<SearchBook[]> {
  const rows = object(value).data
  if (!Array.isArray(rows) || rows.length > 100) throw new ApiRequestError('invalid-response')
  return { data: rows.map(searchBook) }
}
export function parseLibrarySearch(
  value: unknown
): ApiResponse<Array<Pick<Library, 'id' | 'name' | 'address' | 'region' | 'lat' | 'lng'>>> {
  const rows = object(value).data as unknown[]
  const libraries = parseLibraryList(value)
  return {
    data: libraries.map((library, index) => ({
      ...library,
      region: nullableText(object(rows[index]).region) ?? '',
    })),
  }
}
export function parseOperatingHours(value: unknown): LibraryOperatingHours | null {
  if (value == null) return null
  // Older snapshots used string/weekday; normalize them without inventing hours.
  if (typeof value === 'string') return { text: nullableText(value), closed: null }
  const row = object(value)
  return { text: nullableText(row.text ?? row.weekday), closed: nullableText(row.closed) }
}
export function parseLibraryDetail(value: unknown): Library {
  const row = object(object(value).data)
  const id = count(row.id)
  if (
    id === 0 ||
    typeof row.lat !== 'number' ||
    !Number.isFinite(row.lat) ||
    Math.abs(row.lat) > 90 ||
    typeof row.lng !== 'number' ||
    !Number.isFinite(row.lng) ||
    Math.abs(row.lng) > 180
  )
    throw new ApiRequestError('invalid-response')
  return {
    id,
    name: requiredText(row.name),
    address: requiredText(row.address),
    region: requiredText(row.region),
    lat: row.lat,
    lng: row.lng,
    phone: nullableText(row.phone),
    homepage: httpUrl(row.homepage),
    operatingHours: parseOperatingHours(row.operatingHours),
  }
}
