import { Injectable, NotFoundException } from '@nestjs/common'
import { db, libraries, sql, eq } from '@nearbook/db'
import { JeongbonaruService } from '../jeongbonaru/jeongbonaru.service'
import { JeongbonaruClient } from '../jeongbonaru/jeongbonaru.client'
import { CacheService } from '../../common/cache.service'

@Injectable()
export class LibrariesService {
  constructor(
    private readonly jeongbonaru: JeongbonaruService,
    private readonly jeongbonaruClient: JeongbonaruClient,
    private readonly cache: CacheService,
  ) {}

  async findNear(lat: number, lng: number, radiusKm = 5, limit = 20) {
    const result = await db.execute(sql`
      SELECT id, name, address, region, lat, lng, phone, homepage, operating_hours, type,
        ST_Distance(location, ST_MakePoint(${lng}, ${lat})::geography) AS distance_m
      FROM nearbook.libraries
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
          // lib_code가 없는 경우 id를 대신 사용 (또는 스키마에 따라 조정 필요)
          const exist = await this.jeongbonaru.checkBookExist(
            isbn,
            String(lib['id']),
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

  async findInBounds(bounds: {
    swLat: number
    swLng: number
    neLat: number
    neLng: number
    limit: number
  }) {
    const result = await db.execute(sql`
      SELECT id, name, lat, lng, address
      FROM nearbook.libraries
      WHERE
        lat BETWEEN ${bounds.swLat} AND ${bounds.neLat}
        AND lng BETWEEN ${bounds.swLng} AND ${bounds.neLng}
        AND lat IS NOT NULL
        AND lng IS NOT NULL
      ORDER BY name
      LIMIT ${bounds.limit}
    `)
    return { data: result as any[] }
  }

  async getById(id: number) {
    const lib = await db.query.libraries.findFirst({ where: eq(libraries.id, id) })
    if (!lib) throw new NotFoundException(`Library ${id} not found`)
    return lib
  }

  async search(q: string, limit = 10) {
    const result = await db.execute(sql`
      SELECT id, name, address, region, lat, lng
      FROM nearbook.libraries
      WHERE name ILIKE ${'%' + q + '%'}
      ORDER BY name
      LIMIT ${limit}
    `)
    return { data: result as any[] }
  }

  async list(page = 1, limit = 20, region?: string) {
    if (region) {
      return this.findByRegion(region, limit)
    }
    const offset = (page - 1) * limit
    const result = await db.select().from(libraries).limit(limit).offset(offset)
    return { data: result }
  }

  async listRegions(): Promise<{ regions: string[] }> {
    const result = await db.execute(sql`
      SELECT DISTINCT region
      FROM nearbook.libraries
      WHERE region IS NOT NULL
      ORDER BY region ASC
    `)
    return { regions: (result as any[]).map((r) => r.region) }
  }

  async findByRegion(region: string, limit = 50): Promise<{ data: any[] }> {
    const result = await db.execute(sql`
      SELECT id, name, address, region, lat, lng
      FROM nearbook.libraries
      WHERE region LIKE ${`${region}%`}
      ORDER BY name ASC
      LIMIT ${limit}
    `)
    return { data: result as any[] }
  }

  async getPopularBooks(libraryId: number, limit = 20) {
    try {
      const res = await this.jeongbonaruClient.get<any>('/loanItemSrch', {
        libCode: libraryId,
        pageNo: 1,
        pageSize: limit,
      })
      return res?.response?.docs?.map((d: any) => ({
        isbn: d.doc?.isbn13,
        title: d.doc?.bookname,
        author: d.doc?.authors,
        publisher: d.doc?.publisher,
        coverUrl: d.doc?.bookImageURL ?? null,
        loanCount: Number(d.doc?.loan_count ?? 0),
      })) ?? []
    } catch {
      return []
    }
  }

  async getRecentBooks(libraryId: number, limit = 20) {
    const to = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const from = new Date(Date.now() - 30 * 86400000)
      .toISOString().slice(0, 10).replace(/-/g, '')
    try {
      const res = await this.jeongbonaruClient.get<any>('/loanItemSrch', {
        libCode: libraryId,
        from,
        to,
        pageNo: 1,
        pageSize: limit,
      })
      return res?.response?.docs?.map((d: any) => ({
        isbn: d.doc?.isbn13,
        title: d.doc?.bookname,
        author: d.doc?.authors,
        publisher: d.doc?.publisher,
        coverUrl: d.doc?.bookImageURL ?? null,
      })) ?? []
    } catch {
      return []
    }
  }

  async findByRegionWithSigungu(sido: string, sigungu?: string): Promise<{ data: any[] }> {
    if (sigungu) {
      const result = await db.execute(sql`
        SELECT id, name, lat, lng
        FROM nearbook.libraries
        WHERE region LIKE ${`${sido}%`}
          AND address LIKE ${`%${sigungu}%`}
          AND lat IS NOT NULL AND lng IS NOT NULL
        LIMIT 200
      `)
      return { data: result as any[] }
    }
    const result = await db.execute(sql`
      SELECT id, name, lat, lng
      FROM nearbook.libraries
      WHERE region LIKE ${`${sido}%`}
        AND lat IS NOT NULL AND lng IS NOT NULL
      LIMIT 200
    `)
    return { data: result as any[] }
  }
}
