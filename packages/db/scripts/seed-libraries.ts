import 'dotenv/config'
import axios from 'axios'
import { db, libraries, sql } from '../src'

const API_KEY = process.env.JEONGBONARU_API_KEY!
const BASE = 'https://www.data4library.kr/api'

async function seedLibraries() {
  if (!API_KEY) {
    console.error('JEONGBONARU_API_KEY is not set')
    process.exit(1)
  }

  console.log('도서관 시드 시작...')
  let page = 1
  let total = 0

  while (true) {
    const { data } = await axios.get(`${BASE}/libSrch`, {
      params: { authKey: API_KEY, format: 'json', pageNo: page, pageSize: 100 },
    })

    const libs: Array<Record<string, string>> = data?.response?.libs?.map(
      (l: Record<string, unknown>) => l['lib'],
    ) ?? []
    if (!libs.length) break

    for (const lib of libs) {
      const lat = parseFloat(lib['latitude'] ?? '0')
      const lng = parseFloat(lib['longitude'] ?? '0')
      if (!lat || !lng) continue

      const libCode = parseInt(lib['libCode'] ?? '0', 10)
      if (!libCode) continue

      // 정보나루 API에 region/detailRegion 필드 없음 → address에서 파싱
      const addrParts = (lib['address'] ?? '').split(' ')
      const region = addrParts.length >= 2
        ? `${addrParts[0]} ${addrParts[1]}`
        : addrParts[0] ?? ''

      try {
        await db
          .insert(libraries)
          .values({
            id: libCode,
            name: lib['libName'] ?? '',
            address: lib['address'] ?? '',
            region: region || '미분류',
            lat,
            lng,
            location: sql`ST_MakePoint(${lng}, ${lat})::geography`,
            phone: lib['tel'] || null,
            homepage: lib['homepage'] || null,
            operatingHours: lib['operatingTime']
              ? { text: lib['operatingTime'], closed: lib['closed'] ?? '' }
              : null,
            type: lib['libType'] ?? null,
          })
          .onConflictDoUpdate({
            target: libraries.id,
            set: {
              name: lib['libName'] ?? '',
              address: lib['address'] ?? '',
              region: region || '미분류',
              lat,
              lng,
              location: sql`ST_MakePoint(${lng}, ${lat})::geography`,
              phone: lib['tel'] || null,
              homepage: lib['homepage'] || null,
            },
          })

        total++
      } catch (err) {
        console.error(`도서관 ${libCode} 삽입 실패:`, (err as Error).message)
      }
    }

    console.log(`페이지 ${page} 완료, 누적 ${total}개`)
    page++
    if (libs.length < 100) break
    await new Promise((r) => setTimeout(r, 300)) // rate limit
  }

  console.log(`도서관 시드 완료: ${total}개`)
  process.exit(0)
}

seedLibraries().catch(console.error)
