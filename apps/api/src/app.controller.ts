import { Controller, Get } from '@nestjs/common'
import { JeongbonaruClient } from './modules/jeongbonaru/jeongbonaru.client'
import { CacheService } from './common/cache/cache.service'

@Controller()
export class AppController {
  constructor(
    private readonly jeongbonaru: JeongbonaruClient,
    private readonly cache: CacheService,
  ) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      time: new Date().toISOString(),
      jeongbonaru: this.jeongbonaru.getStatus(),
      cache: { memorySize: this.cache.size },
    }
  }
}
