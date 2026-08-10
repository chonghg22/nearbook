/**
 * 도서관 지역 문자열 파싱.
 *
 * `libraries.region`은 "서울특별시 노원구"처럼 시도와 시군구가 한 문자열로 붙어 있고,
 * `"-"`나 `"경상북도 "`(시군구 없음) 같은 오염 값도 섞여 있다.
 * 지역 기반 화면과 링크는 반드시 이 함수를 거쳐 오염 값을 걸러낸다.
 */

export type SplitRegion = {
  sido: string
  sigungu?: string
}

export function splitRegion(region: unknown): SplitRegion | null {
  if (typeof region !== 'string') return null

  const parts = region.trim().split(/\s+/).filter(Boolean)
  const sido = parts[0]

  // "-" 처럼 행정구역으로 볼 수 없는 값은 버린다.
  if (!sido || !/^[가-힣]{2,}$/.test(sido)) return null

  const sigungu = parts[1]
  if (!sigungu || !/^[가-힣]{2,}$/.test(sigungu)) {
    return { sido }
  }

  return { sido, sigungu }
}
