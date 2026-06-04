import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminAuthGuard } from '../guards/admin-auth.guard'
import { AdminDashboardService } from '../services/admin-dashboard.service'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: '관리자 대시보드 요약' })
  getSummary() {
    return this.service.getSummary()
  }
}
