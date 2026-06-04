import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminAuthGuard } from '../guards/admin-auth.guard'
import { AdminFeedbackService } from '../services/admin-feedback.service'
import { AdminListFeedbackDto } from '../dto/admin-list-feedback.dto'
import { UpdateFeedbackStatusDto } from '../dto/update-feedback-status.dto'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/feedback')
export class AdminFeedbackController {
  constructor(private readonly service: AdminFeedbackService) {}

  @Get()
  @ApiOperation({ summary: '관리자 피드백 목록' })
  list(@Query() query: AdminListFeedbackDto) {
    return this.service.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: '관리자 피드백 상세' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id)
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '관리자 피드백 상태 변경' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status)
  }
}
