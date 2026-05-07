import { Injectable, NotFoundException } from '@nestjs/common'
import { db, libraries, sql, eq, and, gte, lte, ilike, asc } from '@nearbook/db'
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
    // PostGIS 전용 쿼리는 raw SQL 유지 (nearbook 스키마 명시)
    const result = await db.execute(sql`
      SELECT id, name, address, region, lat, lng, phone, homepage, operating_hours, type,
        ST_Distance(location, ST_MakePoint(${lng}, ${lat})::geography) AS distance_m
      FROM "nearbook"."libraries"
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
    const nearLibs = await this.findNear(lat, lng, radiusKm, 30)
    if (!nearLibs.length) return []

    const optimized = await this.findNearWithBookFromHoldingIndex(nearLibs, isbn)
    if (optimized.length > 0) return optimized.slice(0, 10)

    // 병렬로 소장 여부 조회 (정보나루 bookExist)
    const results = await Promise.allSettled(
      nearLibs.slice(0, 10).map(async (lib: Record<string, unknown>) => {
        const cacheKey = `exist:${isbn}:${lib['id']}`
        const cached = this.cache.get<Record<string, unknown>>(cacheKey)
        if (cached) return { ...lib, ...cached }

        try {
          // lib_code가 없는 경우 id를 대신 사용 (또는 스키마에 따라 조정 필요)
          const res = await this.jeongbonaru.getBookOwnership(
            isbn,
            String(lib['id']),
          )
          const exist = res?.response?.result
          const availability = {
            holdingCount: exist?.hasBook === 'Y' ? 1 : 0,
            loanAvailable: exist?.loanAvailable === 'Y' ? 1 : 0,
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
    const data = await db
      .select({
        id: libraries.id,
        name: libraries.name,
        lat: libraries.lat,
        lng: libraries.lng,
        address: libraries.address,
      })
      .from(libraries)
      .where(
        and(
          gte(libraries.lat, bounds.swLat),
          lte(libraries.lat, bounds.neLat),
          gte(libraries.lng, bounds.swLng),
          lte(libraries.lng, bounds.neLng),
        ),
      )
      .orderBy(asc(libraries.name))
      .limit(bounds.limit)

    return { data }
  }

  async getById(id: number) {
    const lib = await db.query.libraries.findFirst({ where: eq(libraries.id, id) })
    if (!lib) throw new NotFoundException(`Library ${id} not found`)
    return lib
  }

  async search(q: string, limit = 10) {
    const data = await db
      .select({
        id: libraries.id,
        name: libraries.name,
        address: libraries.address,
        region: libraries.region,
        lat: libraries.lat,
        lng: libraries.lng,
      })
      .from(libraries)
      .where(ilike(libraries.name, `%${q}%`))
      .orderBy(asc(libraries.name))
      .limit(limit)

    return { data }
  }

  async list(page = 1, limit = 20, region?: string) {
    if (region) {
      return this.findByRegion(region, limit)
    }
    const offset = (page - 1) * limit
    const result = await db.select().from(libraries).limit(limit).offset(offset)
    return { data: result }
  }

  async getPopular(limit = 8) {
    const data = await db
      .select()
      .from(libraries)
      .orderBy(asc(libraries.id))
      .limit(limit)
    return { data }
  }

  async listRegions(): Promise<{ regions: string[] }> {
    const result = await db
      .selectDistinct({ region: libraries.region })
      .from(libraries)
      .where(sql`${libraries.region} IS NOT NULL`)
      .orderBy(asc(libraries.region))

    return { regions: result.map((r) => r.region) }
  }

  async findByRegion(region: string, limit = 50): Promise<{ data: any[] }> {
    const data = await db
      .select({
        id: libraries.id,
        name: libraries.name,
        address: libraries.address,
        region: libraries.region,
        lat: libraries.lat,
        lng: libraries.lng,
      })
      .from(libraries)
      .where(ilike(libraries.region, `${region}%`))
      .orderBy(asc(libraries.name))
      .limit(limit)

    return { data }
  }

  async getPopularBooks(libraryId: number, limit = 20) {
    try {
      const res = await this.jeongbonaruClient.get<any>('/loanItemSrch', {
        libCode: libraryId,
        pageNo: 1,
        pageSize: limit,
      }, { priority: 'LOW' })
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
      }, { priority: 'LOW' })
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

  async getNewArrivalBooks(libraryId: number, limit = 20, searchDt?: string) {
    try {
      return await this.jeongbonaru.getLibraryNewArrivalBooks(libraryId, limit, searchDt)
    } catch {
      return []
    }
  }

  async getUsageTrend(libraryId: number) {
    try {
      return await this.jeongbonaru.getLibraryUsageTrend(libraryId)
    } catch {
      return { dayOfWeek: [], hours: [] }
    }
  }

  async findByRegionWithSigungu(sido: string, sigungu?: string): Promise<{ data: any[] }> {
    if (sigungu) {
      const data = await db
        .select({
          id: libraries.id,
          name: libraries.name,
          lat: libraries.lat,
          lng: libraries.lng,
        })
        .from(libraries)
        .where(
          and(
            ilike(libraries.region, `${sido}%`),
            ilike(libraries.address, `%${sigungu}%`),
            sql`${libraries.lat} IS NOT NULL`,
            sql`${libraries.lng} IS NOT NULL`,
          ),
        )
        .limit(200)
      return { data }
    }
    const data = await db
      .select({
        id: libraries.id,
        name: libraries.name,
        lat: libraries.lat,
        lng: libraries.lng,
      })
      .from(libraries)
      .where(
        and(
          ilike(libraries.region, `${sido}%`),
          sql`${libraries.lat} IS NOT NULL`,
          sql`${libraries.lng} IS NOT NULL`,
        ),
      )
      .limit(200)
    return { data }
  }

  private async findNearWithBookFromHoldingIndex(nearLibs: any[], isbn: string) {
    const regionCode = this.getRegionCode(String(nearLibs[0]?.region ?? nearLibs[0]?.address ?? ''))
    if (!regionCode) return []

    try {
      const holdingLibraries = await this.jeongbonaru.getLibrariesByBook(isbn, regionCode, 200)
      const holdingIds = new Set(holdingLibraries.map((lib: any) => Number(lib.id)))
      const candidates = nearLibs.filter((lib) => holdingIds.has(Number(lib.id))).slice(0, 10)

      const results = await Promise.allSettled(
        candidates.map(async (lib) => {
          const cacheKey = `exist:${isbn}:${lib.id}`
          const cached = this.cache.get<Record<string, unknown>>(cacheKey)
          if (cached) return { ...lib, ...cached }

          const res = await this.jeongbonaru.getBookOwnership(isbn, String(lib.id))
          const exist = res?.response?.result
          const availability = {
            holdingCount: 1,
            loanAvailable: exist?.loanAvailable === 'Y' ? 1 : 0,
          }
          this.cache.set(cacheKey, availability, 5 * 60 * 1000)
          return { ...lib, ...availability }
        }),
      )

      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value)
    } catch {
      return []
    }
  }

  private getRegionCode(region: string) {
    if (region.includes('서울')) return '11'
    if (region.includes('부산')) return '21'
    if (region.includes('대구')) return '22'
    if (region.includes('인천')) return '23'
    if (region.includes('광주')) return '24'
    if (region.includes('대전')) return '25'
    if (region.includes('울산')) return '26'
    if (region.includes('세종')) return '29'
    if (region.includes('경기')) return '31'
    if (region.includes('강원')) return '32'
    if (region.includes('충청북') || region.includes('충북')) return '33'
    if (region.includes('충청남') || region.includes('충남')) return '34'
    if (region.includes('전북')) return '35'
    if (region.includes('전라남') || region.includes('전남')) return '36'
    if (region.includes('경상북') || region.includes('경북')) return '37'
    if (region.includes('경상남') || region.includes('경남')) return '38'
    if (region.includes('제주')) return '39'
    return null
  }
}
