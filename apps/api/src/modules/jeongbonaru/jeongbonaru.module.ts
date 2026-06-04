import { Module } from '@nestjs/common'
import { JeongbonaruClient } from './services/jeongbonaru.client'
import { JeongbonaruService } from './services/jeongbonaru.service'
import { JeongbonaruProxyController } from './controllers/jeongbonaru-proxy.controller'

@Module({
  controllers: [JeongbonaruProxyController],
  providers: [JeongbonaruClient, JeongbonaruService],
  exports: [JeongbonaruService, JeongbonaruClient],
})
export class JeongbonaruModule {}
