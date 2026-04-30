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

      await db
        .insert(libraries)
        .values({
          libCode: lib['libCode'] ?? '',
          name: lib['libName'] ?? '',
          address: lib['address'] ?? '',
          region: lib['region'] ?? '',
          detailRegion: lib['detailRegion'] ?? '',
          lat,
          lng,
          phone: lib['tel'] ?? null,
          homepage: lib['homepage'] ?? null,
          closedDays: lib['closed'] ?? null,
        })
        .onConflictDoUpdate({
          target: libraries.libCode,
          set: { name: lib['libName'] ?? '', lat, lng },
        })

      // PostGIS location 컬럼 갱신
      await db.execute(
        sql`UPDATE libraries SET location = ST_MakePoint(${lng}, ${lat})::geography WHERE lib_code = ${lib['libCode']}`,
      )
      total++
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
