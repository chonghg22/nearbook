import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminAuthGuard } from '../guards/admin-auth.guard'
import { AdminNoticesService } from '../services/admin-notices.service'
import { AdminListNoticesDto } from '../dto/admin-list-notices.dto'
import { CreateAdminNoticeDto } from '../dto/create-admin-notice.dto'
import { UpdateAdminNoticeDto } from '../dto/update-admin-notice.dto'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/notices')
export class AdminNoticesController {
  constructor(private readonly service: AdminNoticesService) {}

  @Get()
  @ApiOperation({ summary: '관리자 공지 목록' })
  list(@Query() query: AdminListNoticesDto) {
    return this.service.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: '관리자 공지 상세' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id)
  }

  @Post()
  @ApiOperation({ summary: '관리자 공지 생성' })
  create(@Body() dto: CreateAdminNoticeDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: '관리자 공지 수정' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminNoticeDto) {
    return this.service.update(id, dto)
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: '관리자 공지 게시 상태 변경' })
  setPublish(
    @Param('id', ParseIntPipe) id: number,
    @Body('isPublished') isPublished: boolean,
  ) {
    return this.service.setPublish(id, isPublished)
  }
}
