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

export interface Library {
  id: number
  libCode: string
  name: string
  address: string
  region: string
  lat: number
  lng: number
  phone: string | null
  homepage: string | null
  operatingHours: string | null
  closed: string | null
}

export interface LibraryBook {
  libraryId: number
  isbn: string
  loanable: boolean
  callNumber: string | null
  updatedAt: string
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
