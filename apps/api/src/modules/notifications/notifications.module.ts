import { Module } from '@nestjs/common'
import { NotificationsController } from './controllers/notifications.controller'
import { NotificationsService } from './services/notifications.service'
import { WishlistDigestCron } from './workers/wishlist-digest.cron'
import { ResendClient } from './services/resend.client'
import { NotifyModule } from '../notify/notify.module'
import { PushService } from './services/push.service'
import { JeongbonaruModule } from '../jeongbonaru/jeongbonaru.module'

@Module({
  imports: [NotifyModule, JeongbonaruModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    WishlistDigestCron,
    ResendClient,
    PushService,
  ],
  exports: [NotificationsService, WishlistDigestCron, PushService],
})
export class NotificationsModule {}
