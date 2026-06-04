import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventApplicationAdmissionService } from './event-application-admission.service'
import { EventApplicationsController } from './event-applications.controller'
import { EventApplicationsService } from './event-applications.service'
import { EventApplicationsWorker } from './event-applications.worker'

@Module({
  imports: [AuthModule],
  controllers: [EventApplicationsController],
  providers: [EventApplicationAdmissionService, EventApplicationsService, EventApplicationsWorker],
})
export class EventApplicationsModule {}
