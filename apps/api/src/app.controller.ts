import { Controller, Get } from '@nestjs/common'
import { JeongbonaruClient } from './modules/jeongbonaru/jeongbonaru.client'
import { CacheService } from './common/cache/cache.service'
import { SkipThrottle } from '@nestjs/throttler'

@Controller()
export class AppController {
  constructor(
    private readonly jeongbonaru: JeongbonaruClient,
    private readonly cache: CacheService
  ) {}

  @Get('health')
  @SkipThrottle()
  health() {
    return {
      status: 'ok',
      time: new Date().toISOString(),
      jeongbonaru: this.jeongbonaru.getLocalStatus(),
      cache: { memorySize: this.cache.size },
    }
  }
}
