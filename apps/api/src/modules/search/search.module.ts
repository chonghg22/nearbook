import { Module } from '@nestjs/common'
import { SearchController } from './search.controller'
import { SearchService } from './search.service'
import { OramaIndexService } from './orama-index.service'
import { AladdinFallbackService } from './aladdin-fallback.service'
import { SearchSyncCron } from './search-sync.cron'
import { HomeCurationsModule } from '../home-curations/home-curations.module'

@Module({
  imports: [HomeCurationsModule],
  controllers: [SearchController],
  providers: [SearchService, OramaIndexService, AladdinFallbackService, SearchSyncCron],
  exports: [SearchService, OramaIndexService, AladdinFallbackService],
})
export class SearchModule {}
