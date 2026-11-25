import { Module } from '@nestjs/common'
import { JeongbonaruClient } from './jeongbonaru.client'
import { JeongbonaruService } from './jeongbonaru.service'
import { JeongbonaruProxyController } from './jeongbonaru-proxy.controller'
import { QuotaModule } from '../quota/quota.module'
import { ProviderCacheService } from './provider-cache.service'
import { BookAcquisitionLimiter } from './book-acquisition-limiter.service'

@Module({
  imports: [QuotaModule],
  controllers: [JeongbonaruProxyController],
  providers: [JeongbonaruClient, JeongbonaruService, ProviderCacheService, BookAcquisitionLimiter],
  exports: [JeongbonaruService, JeongbonaruClient, BookAcquisitionLimiter],
})
export class JeongbonaruModule {}
