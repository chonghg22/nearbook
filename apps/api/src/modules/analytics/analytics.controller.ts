import { Body, Controller, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { OptionalAuthGuard } from '../auth/auth.guard'
import { AnalyticsService } from './analytics.service'
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto'

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Post('event')
  @HttpCode(202)
  @UseGuards(OptionalAuthGuard)
  @Throttle({ short: { limit: 20, ttl: 1_000 }, medium: { limit: 300, ttl: 60_000 } })
  @ApiOperation({ summary: '제품 분석 이벤트 저장' })
  async create(
    @Req() req: any,
    @Body() dto: CreateAnalyticsEventDto,
    @Headers('referer') referrer?: string,
  ) {
    const supabaseUserId = req.user?.supabaseUserId ?? null
    return this.service.create({ dto, supabaseUserId, referrer })
  }
}
