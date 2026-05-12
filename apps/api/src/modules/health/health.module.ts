import { Module } from '@nestjs/common'
import { MemoryWatchCron } from './memory-watch.cron'

@Module({
  providers: [MemoryWatchCron],
})
export class HealthModule {}
