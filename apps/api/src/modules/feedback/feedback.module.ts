import { Module } from '@nestjs/common'
import { FeedbackController } from './controllers/feedback.controller'
import { FeedbackService } from './services/feedback.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
