export const POPULAR_QUERIES = [
  '한강',
  '김호연',
  '베르나르 베르베르',
  '세이노의 가르침',
  '불변의 법칙',
  '미움받을 용기',
  '나미야 잡화점의 기적',
  '아몬드',
] as const

export const DEFAULT_API_BASE_URL = 'https://api.near-book.com'
export const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
export const SERVER_API_BASE_URL = process.env.INTERNAL_API_URL ?? PUBLIC_API_BASE_URL
