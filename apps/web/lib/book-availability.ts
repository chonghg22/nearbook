// Edge-safe: used by middleware before a book detail page renders.
import { isProductionApiEnvironment, resolveServerApiBaseUrl } from './api-base-url.mjs'

const TIMEOUT_MS = 8_000
/** 정보나루 일일 한도·일시 장애는 보통 몇 시간 안에 풀린다. 크롤러에게 그때 다시 오라고 알린다. */
export const BOOK_RETRY_AFTER_SECONDS = 3_600

const BOOK_PATH = /^\/book\/([^/]+)\/?$/

/** `/book/<isbn>` 경로면 ISBN을, 아니면 null을 돌려준다. */
export function bookIsbnFromPath(pathname: string): string | null {
  const match = BOOK_PATH.exec(pathname)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

function apiBase() {
  return resolveServerApiBaseUrl({
    internalUrl: process.env.INTERNAL_API_URL,
    publicUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    production: isProductionApiEnvironment({ vercelEnv: process.env.VERCEL_ENV, appEnv: process.env.APP_ENV }),
  })
}

/**
 * 책 메타데이터를 지금 가져올 수 없는 상태인지 확인한다.
 *
 * App Router 페이지는 렌더링 중 오류를 항상 500으로 내보낸다. 정보나루 한도 초과(API 503)나
 * 요청 한도(429)처럼 잠시 뒤 풀리는 상황도 500이 되어 검색엔진이 서버 오류로 기록했다.
 * 미들웨어에서 먼저 확인해 503 + Retry-After로 답할 수 있게 한다.
 *
 * 200/404는 false(페이지가 정상 렌더링하거나 not-found를 낸다). API가 책을 DB에 캐시하므로
 * 뒤이은 페이지 렌더링의 같은 조회는 외부 호출 없이 끝난다.
 */
export async function isBookTemporarilyUnavailable(
  isbn: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(`${apiBase()}/books/${encodeURIComponent(isbn)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    // PR33's metadata contract: not acquired yet, distinct from a genuine 404.
    // Other conflicts (or malformed bodies) keep their existing error path.
    if (response.status === 409) {
      const body = await response.json().catch(() => null)
      return body?.code === 'BOOK_NOT_ACQUIRED'
    }
    return response.status === 429 || response.status >= 500
  } catch {
    // 설정 오류·네트워크 오류·시간 초과: 페이지도 같은 이유로 실패한다.
    return true
  }
}

export function bookUnavailableResponse(): Response {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>잠시 후 다시 시도해 주세요 | 우리동네책</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:20vh auto;padding:0 1.5rem;line-height:1.6;color:#212529"><h1 style="font-size:1.25rem">도서 정보를 잠시 불러올 수 없습니다</h1><p>도서 정보 제공처의 조회 한도에 도달했거나 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.</p><p><a href="/">우리동네책 홈으로</a></p></body></html>`
  return new Response(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': String(BOOK_RETRY_AFTER_SECONDS),
      'Cache-Control': 'no-store',
    },
  })
}
