import { Module, Global } from '@nestjs/common'
import { CacheModule } from './cache/cache.module'

@Global()
@Module({
  imports: [CacheModule],
  exports: [CacheModule],
})
export class CommonModule {}
