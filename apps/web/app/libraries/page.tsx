import Link from 'next/link'
import type { Metadata } from 'next'
import { LibrariesMapView } from './_components/libraries-map-view'
import { SERVER_API_BASE_URL } from '@/lib/constants'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { splitRegion } from '@/lib/seo/region'

export const revalidate = 86400

/**
 * 앱 공통 상수를 그대로 쓴다. 여기서 따로 계산하면 환경변수가 모두 없을 때 빈 문자열이 되고,
 * 상대 URL fetch가 만들어져 이 페이지의 정적 생성이 멈춘다.
 */
const API_URL = SERVER_API_BASE_URL

export const metadata: Metadata = buildPageMetadata({
  path: '/libraries',
  title: '우리 동네 공공도서관 찾기',
  description:
    '전국 공공도서관을 지도와 지역별 목록에서 찾아보세요. 도서관 위치와 운영 정보, 인기 대출 도서와 신착도서를 확인할 수 있습니다.',
})

type LibraryRow = {
  id: number
  name: string
  address?: string | undefined
  region?: string | undefined
}

/** 지도만으로는 검색엔진이 읽을 콘텐츠가 없다. 서버에서 실제 목록을 함께 렌더한다. */
async function fetchLibraries(): Promise<LibraryRow[]> {
  try {
    const res = await fetch(`${API_URL}/libraries?limit=100&page=1`, { next: { revalidate } })
    if (!res.ok) return []
    const json = await res.json()
    const rows: unknown[] = Array.isArray(json.data) ? json.data : []

    return rows
      .map((row) => {
        const item = row as Record<string, unknown>
        return {
          id: Number(item.id),
          name: typeof item.name === 'string' ? item.name.trim() : '',
          address: typeof item.address === 'string' ? item.address : undefined,
          region: typeof item.region === 'string' ? item.region : undefined,
        }
      })
      .filter((row) => Number.isInteger(row.id) && row.name.length > 0)
  } catch {
    return []
  }
}

async function fetchRegions(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/libraries/regions`, { next: { revalidate } })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json.regions) ? json.regions : []
  } catch {
    return []
  }
}

/** 시도별 시군구 목록으로 묶는다. 오염된 region 값은 splitRegion이 걸러낸다. */
function groupRegions(regions: string[]) {
  const grouped = new Map<string, Set<string>>()

  for (const region of regions) {
    const parsed = splitRegion(region)
    if (!parsed) continue
    const sigunguSet = grouped.get(parsed.sido) ?? new Set<string>()
    if (parsed.sigungu) sigunguSet.add(parsed.sigungu)
    grouped.set(parsed.sido, sigunguSet)
  }

  return Array.from(grouped.entries())
    .map(([sido, sigunguSet]) => ({
      sido,
      sigungu: Array.from(sigunguSet).sort((a, b) => a.localeCompare(b, 'ko')),
    }))
    .sort((a, b) => a.sido.localeCompare(b.sido, 'ko'))
}

export default async function LibrariesPage() {
  const [libraries, regions] = await Promise.all([fetchLibraries(), fetchRegions()])
  const groupedRegions = groupRegions(regions)
  const sortedLibraries = [...libraries].sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">우리 동네 공공도서관 찾기</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 md:text-base">
          전국 공공도서관을 지도에서 찾아보세요. 도서관을 선택하면 위치와 운영 정보, 그 도서관에서 많이 빌려 간
          인기 도서와 새로 들어온 신착도서를 확인할 수 있습니다.
        </p>
      </header>

      <LibrariesMapView />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-xl font-bold text-gray-900">도서관 둘러보기</h2>
        <p className="mt-2 text-sm text-gray-600">
          도서관 이름을 누르면 이용 정보와 인기·신착도서를 볼 수 있습니다.
        </p>

        {sortedLibraries.length > 0 ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedLibraries.map((library) => (
              <li key={library.id}>
                <Link
                  href={`/library/${library.id}`}
                  className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-md"
                >
                  <p className="font-semibold text-gray-900">{library.name}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                    {library.address ?? library.region}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            도서관 목록을 불러오는 중입니다. 위 지도에서 먼저 찾아보세요.
          </p>
        )}
      </section>

      {groupedRegions.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-xl font-bold text-gray-900">지역별 도서관 서비스 지역</h2>
          <p className="mt-2 text-sm text-gray-600">
            우리동네책이 도서관 정보를 제공하는 지역입니다. 위 지도의 지역 필터에서 선택할 수 있습니다.
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {groupedRegions.map((group) => (
              <div key={group.sido} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <dt className="font-semibold text-gray-900">
                  {group.sido}
                  {group.sigungu.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      {group.sigungu.length}개 시군구
                    </span>
                  )}
                </dt>
                {group.sigungu.length > 0 && (
                  <dd className="mt-2 text-xs leading-5 text-gray-500">{group.sigungu.join(' · ')}</dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  )
}
