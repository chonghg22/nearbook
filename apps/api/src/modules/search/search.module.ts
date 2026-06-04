import { Module } from '@nestjs/common'
import { SearchController } from './controllers/search.controller'
import { SearchService } from './services/search.service'
import { OramaIndexService } from './services/orama-index.service'
import { AladdinFallbackService } from './services/aladdin-fallback.service'
import { SearchSyncCron } from './workers/search-sync.cron'
import { HomeCurationsModule } from '../home-curations/home-curations.module'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'

@Module({
  imports: [HomeCurationsModule, JeongbonaruModule],
  controllers: [SearchController],
  providers: [SearchService, OramaIndexService, AladdinFallbackService, SearchSyncCron],
  exports: [SearchService, OramaIndexService, AladdinFallbackService],
})
export class SearchModule {}
