import { Controller, Get, Header, Module } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CacheModule } from '../../common/cache/cache.module'
import { CacheService } from '../../common/cache/cache.service'
import { OramaIndexService } from './orama-index.service'
import { SearchIndexRepository } from './search-index.repository'

@Controller('operations/search')
export class SearchIndexStatusController {
  constructor(
    private readonly index: OramaIndexService,
    private readonly cache: CacheService,
    private readonly scheduler: SchedulerRegistry
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  status() {
    const jobs = this.scheduler.getCronJobs()
    return {
      observedAt: new Date().toISOString(),
      index: this.index.getStatus(),
      sharedCache: this.cache.getStatus(),
      searchJobs: ['search:reconcile', 'search:popularity', 'search:rebuild'].map((name) => ({
        name,
        registered: jobs.has(name),
      })),
      responseCache: {
        scope: 'search-service-only',
        max: 500,
        ttlMs: 60000,
        invalidation: 'index-revision',
      },
    }
  }
}

@Module({
  imports: [CacheModule],
  providers: [SearchIndexRepository, OramaIndexService],
  controllers: [SearchIndexStatusController],
  exports: [OramaIndexService],
})
export class SearchIndexModule {}
