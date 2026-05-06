import { Module } from '@nestjs/common'
import { JeongbonaruClient } from './jeongbonaru.client'
import { JeongbonaruService } from './jeongbonaru.service'

@Module({
  providers: [JeongbonaruClient, JeongbonaruService],
  exports: [JeongbonaruService, JeongbonaruClient],
})
export class JeongbonaruModule {}
