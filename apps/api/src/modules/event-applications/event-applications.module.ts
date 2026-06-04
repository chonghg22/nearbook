import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventApplicationAdmissionService } from './services/event-application-admission.service'
import { EventApplicationsController } from './controllers/event-applications.controller'
import { EventApplicationsService } from './services/event-applications.service'
import { EventApplicationsWorker } from './workers/event-applications.worker'

@Module({
  imports: [AuthModule],
  controllers: [EventApplicationsController],
  providers: [EventApplicationAdmissionService, EventApplicationsService, EventApplicationsWorker],
})
export class EventApplicationsModule {}
