import { Module } from '@nestjs/common'
import { CacheService } from '../../common/cache.service'
import { JeongbonaruClient } from './jeongbonaru.client'
import { JeongbonaruService } from './jeongbonaru.service'

@Module({
  providers: [JeongbonaruClient, JeongbonaruService, CacheService],
  exports: [JeongbonaruClient, JeongbonaruService, CacheService],
})
export class JeongbonaruModule {}
