import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../../auth/guards/auth.guard'
import { UpdatePrefDto } from '../dto/update-pref.dto'
import { NotificationsService } from '../services/notifications.service'
import { WishlistDigestCron } from '../workers/wishlist-digest.cron'

@ApiTags('notifications')
@Controller()
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly wishlistDigestCron: WishlistDigestCron,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('me/notification-preferences')
  @ApiOperation({ summary: '내 알림 설정 조회' })
  getMine(@Req() req: any) {
    return this.service.getPref(req.user.supabaseUserId)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch('me/notification-preferences')
  @ApiOperation({ summary: '내 알림 설정 수정' })
  update(@Req() req: any, @Body() dto: UpdatePrefDto) {
    return this.service.updatePref(req.user.supabaseUserId, dto)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('me/push-subscriptions/status')
  @ApiOperation({ summary: '내 웹 푸시 구독 상태 조회' })
  getPushStatus(@Req() req: any) {
    return this.service.getPushStatus(req.user.supabaseUserId)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('me/push-subscriptions')
  @ApiOperation({ summary: '웹 푸시 구독 등록' })
  upsertPushSubscription(@Req() req: any, @Body() body: any) {
    return this.service.upsertPushSubscription(req.user.supabaseUserId, body, req.headers['user-agent'])
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('me/push-subscriptions/delete')
  @ApiOperation({ summary: '웹 푸시 구독 해제' })
  deletePushSubscription(@Req() req: any, @Body() body: any) {
    return this.service.deletePushSubscription(req.user.supabaseUserId, body?.endpoint)
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('me/notification-preferences/reactivate')
  @ApiOperation({ summary: '이메일 알림 상태 재활성화' })
  reactivate(@Req() req: any) {
    return this.service.reactivate(req.user.supabaseUserId)
  }

  @Get('unsubscribe')
  @ApiOperation({ summary: '이메일 알림 수신 거부' })
  unsubscribe(@Query('token') token: string) {
    return this.service.unsubscribeByToken(token)
  }

  @Get('digest/downgrade')
  @ApiOperation({ summary: '이메일 발송 주기를 주 1회로 변경' })
  downgrade(@Query('token') token: string) {
    return this.service.downgradeToWeekly(token)
  }

  @Post('admin/cron/wishlist-digest')
  @HttpCode(202)
  @ApiOperation({ summary: '위시 알림 digest 수동 실행' })
  async runDigest(@Query('secret') secret: string) {
    await this.service.authorizeManualRun(secret)
    return this.wishlistDigestCron.run('manual')
  }

  @Get('admin/notifications/health')
  @ApiOperation({ summary: '알림 발송 상태 통계' })
  async health(@Query('secret') secret: string) {
    await this.service.authorizeManualRun(secret)
    return this.service.getHealth()
  }
}
