import { Injectable, NotFoundException } from '@nestjs/common'
import { db, libraries, sql, eq } from '@nearbook/db'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { CacheService } from '../../common/cache.service'

@Injectable()
export class LibrariesService {
  constructor(
    private readonly jeongbonaru: JeongbonaruService,
    private readonly cache: CacheService,
  ) {}

  async findNear(lat: number, lng: number, radiusKm = 5, limit = 20) {
    const result = await db.execute(sql`
      SELECT id, name, address, region, lat, lng, phone, homepage, closed_days, lib_code,
        ST_Distance(location, ST_MakePoint(${lng}, ${lat})::geography) AS distance_m
      FROM libraries
      WHERE ST_DWithin(location, ST_MakePoint(${lng}, ${lat})::geography, ${radiusKm * 1000})
      ORDER BY distance_m
      LIMIT ${limit}
    `)
    return (result as any[]).map((r: Record<string, unknown>) => ({
      ...r,
      distanceKm: Number((Number(r['distance_m']) / 1000).toFixed(2)),
    }))
  }

  async findNearWithBook(lat: number, lng: number, isbn: string, radiusKm = 5) {
    const nearLibs = await this.findNear(lat, lng, radiusKm, 10)
    if (!nearLibs.length) return []

    // 병렬로 소장 여부 조회 (정보나루 bookExist)
    const results = await Promise.allSettled(
      nearLibs.map(async (lib: Record<string, unknown>) => {
        const cacheKey = `exist:${isbn}:${lib['id']}`
        const cached = this.cache.get<Record<string, unknown>>(cacheKey)
        if (cached) return { ...lib, ...cached }

        try {
          const exist = await this.jeongbonaru.checkBookExist(
            isbn,
            String(lib['lib_code'] ?? lib['id']),
          )
          const availability = {
            holdingCount: exist?.hasBook ? 1 : 0,
            loanAvailable: exist?.loanAvailable ? 1 : 0,
          }
          this.cache.set(cacheKey, availability, 5 * 60 * 1000)
          return { ...lib, ...availability }
        } catch {
          return { ...lib, holdingCount: 0, loanAvailable: 0 }
        }
      }),
    )

    return results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value)
  }

  async getById(id: number) {
    const lib = await db.query.libraries.findFirst({ where: eq(libraries.id, id) })
    if (!lib) throw new NotFoundException(`Library ${id} not found`)
    return lib
  }

  async list(page = 1, limit = 20) {
    const offset = (page - 1) * limit
    return db.select().from(libraries).limit(limit).offset(offset)
  }
}
