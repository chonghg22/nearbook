import { personalApiFetch } from './api-client'
import { parseLibraryLinks } from './library-links.mjs'

export interface WishItem {
  isbn: string
  title: string | null
  author: string | null
  coverUrl: string | null
  addedAt: string
  note: string | null
}
export interface SavedLibraryCard {
  id: number
  libraryId: number
  nickname: string | null
  isDefault: boolean
  library: {
    name: string
    address: string
    lat: number | null
    lng: number | null
    homepage: string | null
  }
}
export interface PersonalList<T> {
  items: T[]
  plan: string
  total: number
}
export class PersonalApiError extends Error {
  constructor(readonly status = 0) {
    super('Personal request failed')
  }
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PersonalApiError()
  return value as Record<string, unknown>
}
const text = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) throw new PersonalApiError()
  return value
}
const optionalText = (value: unknown): string | null => {
  if (value == null) return null
  if (typeof value !== 'string') throw new PersonalApiError()
  return value
}
const id = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new PersonalApiError()
  return value
}
function list<T>(payload: unknown, parse: (row: unknown) => T): PersonalList<T> {
  const value = object(payload)
  if (!Array.isArray(value.data)) throw new PersonalApiError()
  const items = value.data.map(parse)
  const meta =
    value.meta === undefined && items.length === 0 ? { plan: 'free', total: 0 } : object(value.meta)
  if (typeof meta.plan !== 'string' || !meta.plan || meta.total !== items.length)
    throw new PersonalApiError()
  return { items, plan: meta.plan, total: items.length }
}
export function parseWishlists(payload: unknown) {
  const result = list(payload, (row): WishItem => {
    const value = object(row),
      isbn = text(value.isbn),
      addedAt = text(value.addedAt)
    if (!/^(?:\d{13}|\d{9}[\dXx])$/.test(isbn) || !Number.isFinite(Date.parse(addedAt)))
      throw new PersonalApiError()
    const cover = parseLibraryLinks({ homepage: optionalText(value.coverUrl) }).homepage
    return {
      isbn,
      title: optionalText(value.title),
      author: optionalText(value.author),
      coverUrl: cover,
      addedAt,
      note: optionalText(value.note),
    }
  })
  if (new Set(result.items.map((row) => row.isbn)).size !== result.items.length)
    throw new PersonalApiError()
  return result
}
export function parseSavedLibraries(payload: unknown) {
  const result = list(payload, (row): SavedLibraryCard => {
    const value = object(row),
      library = object(value.library)
    if (typeof value.isDefault !== 'boolean') throw new PersonalApiError()
    return {
      id: id(value.id),
      libraryId: id(value.libraryId),
      nickname: optionalText(value.nickname),
      isDefault: value.isDefault,
      library: {
        name: text(library.name),
        address: text(library.address),
        ...parseLibraryLinks(library),
      },
    }
  })
  if (
    new Set(result.items.map((row) => row.id)).size !== result.items.length ||
    new Set(result.items.map((row) => row.libraryId)).size !== result.items.length
  )
    throw new PersonalApiError()
  return result
}
export function parseAdded(payload: unknown): boolean {
  const value = object(object(payload).data)
  if (typeof value.added !== 'boolean') throw new PersonalApiError()
  return value.added
}
export async function personalResponse(path: string, options: RequestInit = {}) {
  const response = await personalApiFetch(path, { ...options, timeoutMs: 15000 })
  if (!response.ok) throw new PersonalApiError(response.status)
  return response
}
export async function personalJson<T>(
  path: string,
  parse: (value: unknown) => T,
  options: RequestInit = {}
): Promise<T> {
  const response = await personalResponse(path, options)
  try {
    return parse(await response.json())
  } catch {
    throw new PersonalApiError()
  }
}
export function personalErrorMessage(error: unknown): string {
  const status = error instanceof PersonalApiError ? error.status : 0
  return status === 401
    ? '로그인이 필요하거나 세션이 만료됐습니다. 다시 로그인해 주세요.'
    : status === 403
      ? '현재 등록 한도에 도달했습니다. 기존 목록을 확인해 주세요.'
      : status === 409
        ? '기본 도서관이 없거나 변경됐습니다. 내 도서관 설정을 확인한 뒤 목록을 새로 불러오세요.'
        : status === 404
          ? '책이나 도서관 설정이 변경됐습니다. 목록을 다시 불러오세요.'
          : '요청을 완료하지 못했습니다. 상태를 다시 확인한 뒤 시도해 주세요.'
}
