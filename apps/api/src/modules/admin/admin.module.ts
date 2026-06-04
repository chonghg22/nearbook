import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { AdminAuthGuard } from './guards/admin-auth.guard'
import { AdminDashboardController } from './controllers/admin-dashboard.controller'
import { AdminDashboardService } from './services/admin-dashboard.service'
import { AdminAuthController } from './controllers/admin-auth.controller'
import { AdminAuthService } from './services/admin-auth.service'
import { AdminFeedbackController } from './controllers/admin-feedback.controller'
import { AdminFeedbackService } from './services/admin-feedback.service'
import { AdminLibrariesController } from './controllers/admin-libraries.controller'
import { AdminLibrariesService } from './services/admin-libraries.service'
import { AdminNoticesController } from './controllers/admin-notices.controller'
import { AdminNoticesService } from './services/admin-notices.service'
import { AdminOperationsController } from './controllers/admin-operations.controller'
import { AdminUsersController } from './controllers/admin-users.controller'
import { AdminUsersService } from './services/admin-users.service'

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
