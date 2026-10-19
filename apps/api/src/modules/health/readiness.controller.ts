import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { ReadinessService } from './readiness.service'

@Controller('ready')
@SkipThrottle()
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async ready() {
    const result = await this.readiness.check()
    if (result.status !== 'ready') throw new ServiceUnavailableException(result)
    return result
  }
}
