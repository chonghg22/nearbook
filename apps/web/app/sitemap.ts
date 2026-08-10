import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/category-config'
import { isProductionDeployment } from '@/lib/seo/deployment-environment'
import { toAbsoluteSiteUrl } from '@/lib/seo/site-url'
import {
  collectSitemapBooks,
  collectSitemapLibraries,
  defaultFetchJson,
  enforceSitemapLimit,
  type FetchJson,
} from '@/lib/seo/sitemap-source'

/**
 * API 장애가 곧바로 sitemap에 반영되지 않도록 6시간 동안 직전 성공 결과를 재사용한다.
 * (기존 구현은 no-store여서 API가 잠깐 죽으면 sitemap이 즉시 비었다.)
 */
export const revalidate = 21600

/**
 * 콘텐츠가 실제로 바뀐 날짜. 매 요청 new Date()를 쓰면 검색엔진에 거짓 신호를 준다.
 * 페이지 내용을 수정할 때 함께 갱신한다.
 */
const CONTENT_UPDATED_AT = '2026-08-10'
const LEGAL_UPDATED_AT = '2026-05-07'

type StaticEntry = {
  path: string
  lastModified: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

/**
 * 색인 정책표의 indexable 집합과 반드시 일치해야 한다.
 * noindex인 /search, /scan, /events, /me, 인증·토큰 라우트는 넣지 않는다.
 */
const STATIC_ENTRIES: StaticEntry[] = [
  { path: '/', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'daily', priority: 1.0 },
  { path: '/popular', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'daily', priority: 0.8 },
  { path: '/rising', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'daily', priority: 0.8 },
  { path: '/new-books', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'daily', priority: 0.7 },
  { path: '/keywords', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'weekly', priority: 0.6 },
  { path: '/libraries', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'weekly', priority: 0.8 },
  { path: '/category', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'weekly', priority: 0.7 },
  { path: '/explore', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'weekly', priority: 0.5 },
  { path: '/qna', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'monthly', priority: 0.4 },
  { path: '/notices', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'weekly', priority: 0.4 },
  { path: '/feedback', lastModified: CONTENT_UPDATED_AT, changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms', lastModified: LEGAL_UPDATED_AT, changeFrequency: 'yearly', priority: 0.2 },
  { path: '/privacy', lastModified: LEGAL_UPDATED_AT, changeFrequency: 'yearly', priority: 0.2 },
]

async function collectNotices(
  fetchJson: FetchJson,
): Promise<{ id: number; publishedAt?: string | undefined }[]> {
  const api = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

  try {
    // notices API의 pageSize 상한은 50이다.
    const payload = await fetchJson(`${api}/notices?pageSize=50`)
    const rows = (payload as { data?: unknown })?.data
    if (!Array.isArray(rows)) return []

    return rows
      .map((row: Record<string, unknown>) => ({
        id: Number(row.id),
        publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : undefined,
      }))
      .filter((row) => Number.isInteger(row.id) && row.id > 0)
  } catch (error) {
    console.error('[sitemap] 공지 목록 수집 실패', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // preview/dev 배포는 색인 대상이 아니다. API도 호출하지 않는다.
  if (!isProductionDeployment()) return []

  const fetchJson = defaultFetchJson

  // 섹션별로 독립 실행한다. 한 소스가 실패해도 나머지 URL은 그대로 남는다.
  // 병렬로 돌리면 API rate limit(초당 10회)을 넘겨 대량의 URL이 유실되므로 순차로 수집한다.
  const bookResult = await collectSitemapBooks(fetchJson).catch((error) => {
    console.error('[sitemap] 도서 URL 수집 실패', error)
    return { books: [], stats: null }
  })
  const libraries = await collectSitemapLibraries(fetchJson).catch((error) => {
    console.error('[sitemap] 도서관 URL 수집 실패', error)
    return []
  })
  const notices = await collectNotices(fetchJson)

  const staticPages: MetadataRoute.Sitemap = STATIC_ENTRIES.map((entry) => ({
    url: toAbsoluteSiteUrl(entry.path),
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((category) => ({
    url: toAbsoluteSiteUrl(`/category/${category.slug}`),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const noticePages: MetadataRoute.Sitemap = notices.map((notice) => ({
    url: toAbsoluteSiteUrl(`/notices/${notice.id}`),
    ...(notice.publishedAt ? { lastModified: notice.publishedAt } : {}),
    changeFrequency: 'yearly',
    priority: 0.3,
  }))

  const bookPages: MetadataRoute.Sitemap = bookResult.books.map((book) => ({
    url: toAbsoluteSiteUrl(`/book/${book.isbn}`),
    // 도서 API가 갱신 시각을 주지 않는다. 없는 값을 지어내지 않는다.
    changeFrequency: 'monthly',
    priority: 0.9,
  }))

  const libraryPages: MetadataRoute.Sitemap = libraries.map((library) => ({
    url: toAbsoluteSiteUrl(`/library/${library.id}`),
    ...(library.lastModified ? { lastModified: library.lastModified } : {}),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return enforceSitemapLimit([
    ...staticPages,
    ...categoryPages,
    ...noticePages,
    ...bookPages,
    ...libraryPages,
  ])
}
