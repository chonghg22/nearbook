import { Module } from '@nestjs/common'
import { JeongbonaruClient } from './jeongbonaru.client'
import { JeongbonaruService } from './jeongbonaru.service'
import { JeongbonaruProxyController } from './jeongbonaru-proxy.controller'
import { QuotaModule } from '../quota/quota.module'

@Module({
  imports: [QuotaModule],
  controllers: [JeongbonaruProxyController],
  providers: [JeongbonaruClient, JeongbonaruService],
  exports: [JeongbonaruService, JeongbonaruClient],
})
export class JeongbonaruModule {}
