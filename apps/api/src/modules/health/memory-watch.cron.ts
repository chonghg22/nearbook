import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { NotifyService } from '../notify/notify.service'

@Injectable()
export class MemoryWatchCron {
  private readonly logger = new Logger(MemoryWatchCron.name)

  constructor(private readonly notify: NotifyService) {}

  @Cron('*/5 * * * *')
  async watch() {
    const m = process.memoryUsage()
    const heapMB = Math.round(m.heapUsed / 1024 / 1024)
    const rssMB = Math.round(m.rss / 1024 / 1024)

    if (rssMB > 700) {
      this.logger.warn(`High memory: rss=${rssMB}MB heap=${heapMB}MB`)
      await this.notify.sendDiscord({
        level: 'critical',
        title: 'API 메모리 경고',
        description: `RSS ${rssMB}MB / 1GB — OCI A1 이전 검토 필요`,
        fields: [
          { name: 'RSS', value: `${rssMB}MB`, inline: true },
          { name: 'Heap', value: `${heapMB}MB`, inline: true },
        ],
        cooldownKey: 'memory-high',
        cooldownMs: 30 * 60_000, // 30분 쿨다운
      })
    }
  }
}
