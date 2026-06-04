import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminAuthGuard } from './admin-auth.guard'
import { AdminUsersService } from './admin-users.service'
import { PaginationQueryDto } from './dto/pagination-query.dto'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: '관리자 사용자 목록' })
  list(@Query() query: PaginationQueryDto) {
    return this.service.list(query)
  }

  @Get(':id')
  @ApiOperation({ summary: '관리자 사용자 상세' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id)
  }
}
