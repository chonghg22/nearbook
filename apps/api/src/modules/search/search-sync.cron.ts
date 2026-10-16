import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { OramaIndexService } from './orama-index.service'

@Injectable()
export class SearchSyncCron {
  private readonly logger = new Logger(SearchSyncCron.name)

  constructor(private readonly orama: OramaIndexService) {}

  @Cron('*/5 * * * *', { name: 'search:reconcile', timeZone: 'Asia/Seoul' })
  async syncDelta() {
    try {
      await this.orama.reconcile()
    } catch {
      this.logger.warn('Search reconciliation failed; cursor retained for replay')
    }
  }

  // One DB snapshot supplies metadata AND the latest nationwide popularity.
  // Removed ranks reset to zero. No N+1 queries or external provider calls.
  @Cron('30 4 * * *', { name: 'search:popularity', timeZone: 'Asia/Seoul' })
  async refreshPopularityScore() {
    await this.rebuild()
  }

  @Cron('0 3 * * 0', { name: 'search:rebuild', timeZone: 'Asia/Seoul' })
  async weeklyFullRebuild() {
    await this.rebuild()
  }

  private async rebuild() {
    try {
      await this.orama.fullRebuild()
    } catch {
      this.logger.warn('Scheduled search rebuild failed; previous generation retained')
    }
  }
}
