import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { WishlistDigestCron } from '../../notifications/workers/wishlist-digest.cron'
import { NotificationsService } from '../../notifications/services/notifications.service'
import { AdminAuthGuard } from '../guards/admin-auth.guard'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/operations')
export class AdminOperationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly wishlistDigestCron: WishlistDigestCron,
  ) {}

  @Post('notifications/wishlist-digest')
  @HttpCode(202)
  @ApiOperation({ summary: '관리자 위시리스트 digest 수동 실행' })
  runWishlistDigest() {
    return this.wishlistDigestCron.run('manual')
  }

  @Get('notifications/health')
  @ApiOperation({ summary: '관리자 알림 헬스 조회' })
  async getNotificationHealth() {
    return { data: await this.notificationsService.getHealth() }
  }
}
