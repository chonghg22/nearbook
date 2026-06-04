import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminAuthGuard } from '../guards/admin-auth.guard'
import { AdminLibrariesService } from '../services/admin-libraries.service'
import { PaginationQueryDto } from '../dto/pagination-query.dto'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/libraries')
export class AdminLibrariesController {
  constructor(private readonly service: AdminLibrariesService) {}

  @Get()
  @ApiOperation({ summary: '관리자 도서관 목록' })
  list(@Query() query: PaginationQueryDto) {
    return this.service.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: '관리자 도서관 상세' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id)
  }
}
