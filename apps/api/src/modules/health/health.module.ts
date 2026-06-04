import { Module } from '@nestjs/common'
import { MemoryWatchCron } from './workers/memory-watch.cron'

@Module({
  providers: [MemoryWatchCron],
})
export class HealthModule {}
