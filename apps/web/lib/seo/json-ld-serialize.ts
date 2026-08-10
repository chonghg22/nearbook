import type { Graph } from 'schema-dts'

/**
 * JSON-LD를 <script> 안에 넣을 때 안전하게 직렬화한다.
 *
 * 도서 제목·저자·도서관 이름은 외부 데이터라서 `<`가 들어올 수 있고,
 * 그대로 두면 `</script>`가 script를 조기 종료시킨다.
 * `<`만 이스케이프해도 종료 태그와 주석 시작(`<!--`)이 모두 막힌다.
 */
export function serializeJsonLd(data: Graph) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/**
 * 값이 비어 있는 필드를 제거한다.
 * 검색엔진에 빈 문자열이나 null을 넘기면 불완전한 구조화 데이터가 된다.
 */
export function compactJsonLd<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, item]) => {
    if (item === undefined || item === null) return false
    if (typeof item === 'string') return item.trim().length > 0
    if (Array.isArray(item)) return item.length > 0
    return true
  })

  return Object.fromEntries(entries) as T
}
