export * from './search'

export interface Book {
  isbn: string
  title: string
  author: string
  publisher: string | null
  publishedYear: number | null
  coverUrl: string | null
  summary: string | null
  category: string | null
}

export interface LibraryOperatingHours {
  text: string | null
  closed: string | null
}

export interface Library {
  id: number
  name: string
  address: string
  region: string
  lat: number
  lng: number
  phone: string | null
  homepage: string | null
  operatingHours: LibraryOperatingHours | null
}

export interface SearchBook {
  isbn: string
  title: string
  author: string | null
  publisher: string | null
  coverUrl: string | null
}

export interface SearchResult {
  items: SearchBook[]
  total: number
  page: number
  pageSize: number
  durationMs?: number
  suggestions?: string[]
  trending?: string[]
}

export type ApiRequestKind = 'http' | 'timeout' | 'network' | 'aborted' | 'invalid-response'

export interface LibraryBook {
  libraryId: number
  isbn: string
  loanable: boolean
  callNumber: string | null
  updatedAt: string
}

// bookExist reports yes/no, not copy counts or a reservation guarantee.
export type HoldingStatus = 'available' | 'borrowed' | 'not_held' | 'unknown'
export interface HoldingObservation {
  status: HoldingStatus
  hasBook: boolean | null
  loanAvailable: boolean | null
  checkedAt: string | null
  lastAttemptAt: string
  source: 'jeongbonaru:bookExist'
  stale: boolean
  reason?: 'timeout' | 'quota' | 'upstream' | 'invalid-response'
}
export interface NearbyHolding extends HoldingObservation {
  id: number
  name: string
  distanceKm?: number
}
export interface HoldingsSummary {
  nearbyCount: number
  attemptedCount: number
  checkedCount: number
  heldCount: number
  availableCount: number
  borrowedCount: number
  notHeldCount: number
  unknownCount: number
  uncheckedCount: number
  limited: boolean
  source: 'jeongbonaru:bookExist'
}
export interface HoldingsResult {
  libraries: NearbyHolding[]
  holdings: HoldingsSummary
}

export interface User {
  id: number
  supabaseUserId: string
  email: string | null
  nickname: string | null
  region: string | null
  plan: 'free' | 'pro'
  createdAt: string
}

export interface Wishlist {
  isbn: string
  addedAt: string
  note: string | null
}

export interface ApiResponse<T> {
  data: T
  meta?: { total?: number; page?: number; pageSize?: number }
}

export interface ApiError {
  statusCode: number
  message: string
  error: string
}

export interface JeongbonaruLibrary {
  libCode: string
  libName: string
  address: string
  tel: string
  latitude: string
  longitude: string
  homepage: string
  closed: string
  operatingTime: string
}

// Auth
export interface JwtUser {
  supabaseUserId: string
  email: string | null
  provider: string
}
