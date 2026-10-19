import { Module } from '@nestjs/common'
import { MemoryWatchCron } from './memory-watch.cron'
import { SearchIndexModule } from '../search/search-index.module'
import { ReadinessService } from './readiness.service'
import { ReadinessController } from './readiness.controller'

@Module({
  imports: [SearchIndexModule],
  controllers: [ReadinessController],
  providers: [MemoryWatchCron, ReadinessService],
})
export class HealthModule {}
