import type { FetchJson } from './sitemap-source'

// Stable public URLs. Historical administrative names resolve to the same slug.
export const REGION_DEFINITIONS = [
  { slug: 'seoul', name: '서울특별시', aliases: [] },
  { slug: 'busan', name: '부산광역시', aliases: [] },
  { slug: 'daegu', name: '대구광역시', aliases: [] },
  { slug: 'incheon', name: '인천광역시', aliases: [] },
  { slug: 'gwangju', name: '광주광역시', aliases: [] },
  { slug: 'daejeon', name: '대전광역시', aliases: [] },
  { slug: 'ulsan', name: '울산광역시', aliases: [] },
  { slug: 'sejong', name: '세종특별자치시', aliases: [] },
  { slug: 'gyeonggi', name: '경기도', aliases: [] },
  { slug: 'gangwon', name: '강원특별자치도', aliases: ['강원도'] },
  { slug: 'chungbuk', name: '충청북도', aliases: [] },
  { slug: 'chungnam', name: '충청남도', aliases: [] },
  { slug: 'jeonbuk', name: '전북특별자치도', aliases: ['전라북도'] },
  { slug: 'jeonnam', name: '전라남도', aliases: [] },
  { slug: 'gyeongbuk', name: '경상북도', aliases: [] },
  { slug: 'gyeongnam', name: '경상남도', aliases: [] },
  { slug: 'jeju', name: '제주특별자치도', aliases: ['제주도'] },
]

export type DirectoryLibrary = { id: number; name: string; address: string; region: string }
export type RegionDirectoryEntry = {
  slug: string
  name: string
  libraries: DirectoryLibrary[]
  districts: string[]
}
export const MIN_REGION_LIBRARIES = 3

export function buildRegionDirectory(libraries: DirectoryLibrary[]): RegionDirectoryEntry[] {
  return REGION_DEFINITIONS.flatMap((definition) => {
    const names = [definition.name, ...definition.aliases]
    const rows = libraries
      .filter((library) => {
        const parts = library.region.trim().split(/\s+/)
        // A bare province or polluted administrative name cannot create a landing.
        // Sejong is a single-tier city and legitimately has no district.
        return (
          names.includes(parts[0] ?? '') &&
          ((parts.length > 1 && /^[가-힣]{2,}$/.test(parts[1] ?? '')) ||
            (parts.length === 1 && definition.slug === 'sejong'))
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.id - b.id)
    if (rows.length < MIN_REGION_LIBRARIES) return []
    const districts = [
      ...new Set(
        rows.map((row) => row.region.trim().split(/\s+/)[1]).filter((x): x is string => !!x)
      ),
    ].sort((a, b) => a.localeCompare(b, 'ko'))
    return [{ slug: definition.slug, name: definition.name, libraries: rows, districts }]
  })
}

/** A complete snapshot is mandatory: partial pages never become regional counts/URLs. */
export async function collectRegionLibraries(
  fetchPage: (page: number) => ReturnType<FetchJson>
): Promise<DirectoryLibrary[]> {
  const result: DirectoryLibrary[] = []
  const seen = new Set<number>()
  for (let page = 1; page <= 40; page++) {
    const payload = await fetchPage(page)
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('data' in payload) ||
      !Array.isArray(payload.data)
    ) {
      throw new Error('Invalid library directory')
    }
    const rows: unknown[] = payload.data
    for (const row of rows) {
      if (!row || typeof row !== 'object') throw new Error('Invalid library row')
      const item = row as Record<string, unknown>
      const id = Number(item.id)
      if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        seen.has(id) ||
        typeof item.name !== 'string' ||
        !item.name.trim()
      ) {
        throw new Error('Incomplete or unstable library directory')
      }
      seen.add(id)
      result.push({
        id,
        name: item.name.trim(),
        address: typeof item.address === 'string' ? item.address.trim() : '',
        region: typeof item.region === 'string' ? item.region.trim() : '',
      })
    }
    if (rows.length < 100) return result
  }
  throw new Error('Library directory page limit exceeded')
}

export function regionDescription(entry: RegionDirectoryEntry) {
  const area = entry.districts.slice(0, 4).join('·')
  return `${entry.name}${area ? ` ${area} 등` : ''}의 공공도서관 ${entry.libraries.length}곳을 찾아보세요. 도서관별 주소와 이용 정보, 인기·신착 도서를 확인할 수 있습니다.`
}
