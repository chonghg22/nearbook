import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { QuotaService } from './quota.service'

@Injectable()
export class QuotaCron {
  private readonly logger = new Logger(QuotaCron.name)

  constructor(private readonly quota: QuotaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkThresholds() {
    try {
      await this.quota.checkAndNotifyThresholds('jeongbonaru', true)
      await this.quota.checkAbuse('jeongbonaru')
    } catch (err) {
      this.logger.error('quota cron failed', err as Error)
    }
  }

  // 한국 자정 — day marker 리셋
  @Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
  resetMarkers() {
    this.quota.resetDayMarkers()
  }
}
