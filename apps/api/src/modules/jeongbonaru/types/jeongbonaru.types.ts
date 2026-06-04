// 정보나루 OpenAPI 응답: 엔드포인트마다 약간씩 다름. 핵심 키만 좁게 타이핑.

export interface JeongbonaruBookDoc {
  isbn13?: string
  bookname?: string
  authors?: string
  publisher?: string
  publication_year?: string
  bookImageURL?: string
  description?: string
  class_nm?: string
  loan_count?: string
}

export interface JeongbonaruDocsResponse {
  response?: {
    docs?: Array<{ doc: JeongbonaruBookDoc }>
    numFound?: number
    resultNum?: number
    pageNo?: number
    pageSize?: number
  }
}

export interface JeongbonaruMonthlyKeyword {
  word?: string
  weight?: number | string
}

export interface JeongbonaruMonthlyKeywordsResponse {
  response?: {
    resultNum?: number
    keywords?: Array<{ keyword: JeongbonaruMonthlyKeyword }>
  }
}

export interface JeongbonaruHotTrendDoc {
  no?: number | string
  difference?: number | string
  baseWeekRank?: number | string
  pastWeekRank?: number | string
  bookname?: string
  authors?: string
  publisher?: string
  publication_year?: string
  isbn13?: string
  bookImageURL?: string
}

export interface JeongbonaruHotTrendResponse {
  response?: {
    results?: Array<{
      result?: {
        date?: string
        docs?: Array<{ doc: JeongbonaruHotTrendDoc }>
      }
    }>
  }
}

export interface JeongbonaruLibrary {
  libCode?: string
  libName?: string
  address?: string
  region?: string
  latitude?: string
  longitude?: string
  tel?: string
  homepage?: string
  operating_time?: string
  libType?: string
}

export interface JeongbonaruLibsResponse {
  response?: {
    libs?: Array<{ lib: JeongbonaruLibrary }>
    numFound?: number
  }
}

export interface JeongbonaruBookExistResponse {
  response?: {
    isbn13?: string
    result?: {
      hasBook?: 'Y' | 'N'
      loanAvailable?: 'Y' | 'N'
      title?: string
      author?: string
      publisher?: string
      publishedYear?: string
      bookImageURL?: string
      callNumber?: string
    }
  }
}

export interface BookCacheRow {
  isbn: string
  title: string
  author: string | null
  publisher: string | null
  publishedYear: number | null
  coverUrl: string | null
  summary: string | null
  category: string | null
}
