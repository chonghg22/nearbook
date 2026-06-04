import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { AdminAuthGuard } from './admin-auth.guard'
import { AdminDashboardController } from './admin-dashboard.controller'
import { AdminDashboardService } from './admin-dashboard.service'
import { AdminAuthController } from './admin-auth.controller'
import { AdminAuthService } from './admin-auth.service'
import { AdminFeedbackController } from './admin-feedback.controller'
import { AdminFeedbackService } from './admin-feedback.service'
import { AdminLibrariesController } from './admin-libraries.controller'
import { AdminLibrariesService } from './admin-libraries.service'
import { AdminNoticesController } from './admin-notices.controller'
import { AdminNoticesService } from './admin-notices.service'
import { AdminOperationsController } from './admin-operations.controller'
import { AdminUsersController } from './admin-users.controller'
import { AdminUsersService } from './admin-users.service'

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminNoticesController,
    AdminFeedbackController,
    AdminUsersController,
    AdminLibrariesController,
    AdminOperationsController,
  ],
  providers: [
    AdminAuthService,
    AdminAuthGuard,
    AdminDashboardService,
    AdminNoticesService,
    AdminFeedbackService,
    AdminUsersService,
    AdminLibrariesService,
  ],
})
export class AdminModule {}
