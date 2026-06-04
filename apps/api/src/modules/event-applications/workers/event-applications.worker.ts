import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { EventApplicationsService } from '../services/event-applications.service'

@Injectable()
export class EventApplicationsWorker {
  private readonly logger = new Logger(EventApplicationsWorker.name)
  private readonly batchSize = Number(process.env.EVENT_APPLICATION_BATCH_SIZE ?? 25)

  constructor(private readonly service: EventApplicationsService) {}

  @Cron('*/10 * * * * *')
  async processQueuedApplications() {
    try {
      const processed = await this.service.processQueuedBatch(this.batchSize)
      if (processed > 0) {
        this.logger.debug(`processed ${processed} event application requests`)
      }
    } catch (err) {
      this.logger.error('event application worker failed', err as Error)
    }
  }
}
