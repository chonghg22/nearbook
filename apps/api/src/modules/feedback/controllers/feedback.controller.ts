import { Body, Controller, Get, Headers, Post, Req, UseGuards, HttpCode } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { OptionalAuthGuard, AuthGuard } from '../../auth/guards/auth.guard'
import { FeedbackService } from '../services/feedback.service'
import { CreateFeedbackDto } from '../dto/create-feedback.dto'

@ApiTags('feedback')
@Controller()
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post('feedback')
  @HttpCode(201)
  @UseGuards(OptionalAuthGuard)
  @Throttle({ short: { limit: 3, ttl: 60_000 }, medium: { limit: 20, ttl: 3_600_000 } })
  @ApiOperation({ summary: '오류 신고/개선 제안 작성 (미인증 OK)' })
  async create(
    @Req() req: any,
    @Body() dto: CreateFeedbackDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    const supabaseUserId = req.user?.supabaseUserId ?? null
    const created = await this.service.create({ dto, supabaseUserId, userAgent })
    return { data: created }
  }

  @Get('me/feedback')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내가 작성한 피드백 목록' })
  async listMine(@Req() req: any) {
    const items = await this.service.listByUser(req.user.supabaseUserId)
    return { data: items, meta: { total: items.length } }
  }
}
