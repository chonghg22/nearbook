import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { db, bookCache, popularBooks, eq, asc, sql } from '@nearbook/db'
import { OramaIndexService } from '../services/orama-index.service'

@Injectable()
export class SearchSyncCron {
  private readonly logger = new Logger(SearchSyncCron.name)

  constructor(private readonly orama: OramaIndexService) {}

  // 5분마다: 최근 변경된 book_cache → Orama 반영
  @Cron('*/5 * * * *')
  async syncDelta() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000)
    const rows = await db.select().from(bookCache)
      .where(sql`${bookCache.cachedAt} > ${fiveMinAgo}`)
      .limit(500)
    if (rows.length > 0) {
      await this.orama.upsertMany(rows)
      this.logger.debug(`Delta sync: ${rows.length} docs`)
    }
  }

  // 매시간: 디스크 영속화 (safety)
  @Cron('0 * * * *')
  async persistHourly() {
    await this.orama.persist()
    this.logger.debug('Hourly persist done')
  }

  // 매일 04:30: popularityScore 갱신
  @Cron('30 4 * * *', { timeZone: 'Asia/Seoul' })
  async refreshPopularityScore() {
    const popular = await db.select().from(popularBooks)
      .where(eq(popularBooks.region, '전국'))
      .orderBy(asc(popularBooks.rank))
      .limit(5000)

    const merged = await Promise.all(
      popular.map(async p => {
        const rows = await db.select().from(bookCache).where(eq(bookCache.isbn, p.isbn))
        const cached = rows[0]
        if (!cached) return null
        return { ...cached, popularityScore: 10000 - p.rank }
      })
    )

    const valid = merged.filter(Boolean) as any[]
    if (valid.length > 0) {
      await this.orama.upsertMany(valid)
      this.logger.log(`Popularity refresh: ${valid.length} docs`)
    }
  }

  // 매주 일요일 03:00: 풀 리빌드
  @Cron('0 3 * * 0', { timeZone: 'Asia/Seoul' })
  async weeklyFullRebuild() {
    this.logger.log('Weekly full rebuild starting')
    await this.orama.fullRebuild()
    this.logger.log('Weekly full rebuild done')
  }
}
