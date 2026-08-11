/**
 * 사이트 origin과 절대 URL 생성을 담당하는 단일 진입점.
 * canonical, sitemap, robots, JSON-LD가 모두 이 모듈만 사용해야
 * metadata와 구조화 데이터의 URL이 어긋나지 않는다.
 */

const DEFAULT_PROD_SITE_URL = 'https://www.near-book.com'
const DEFAULT_DEV_SITE_URL = 'http://localhost:3000'

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, '')
}

export function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (configured) {
    try {
      return normalizeOrigin(new URL(configured).origin)
    } catch {
      // 형식이 깨진 값은 무시하고 기본값으로 되돌린다.
    }
  }

  return process.env.NODE_ENV === 'production' ? DEFAULT_PROD_SITE_URL : DEFAULT_DEV_SITE_URL
}

/**
 * canonical과 JSON-LD에 쓰는 절대 URL.
 * 쿼리스트링과 해시는 항상 제거한다. 같은 콘텐츠가 쿼리별로 중복 색인되면 안 된다.
 */
export function toAbsoluteSiteUrl(pathname: string) {
  const url = new URL(pathname, `${getSiteOrigin()}/`)
  url.search = ''
  url.hash = ''
  return url.toString()
}
