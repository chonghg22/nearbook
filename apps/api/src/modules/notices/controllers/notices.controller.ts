import { Controller, Get, Param, Query, NotFoundException, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { NoticesService } from '../services/notices.service'
import { ListNoticesDto } from '../dto/list-notices.dto'

@ApiTags('notices')
@Controller('notices')
export class NoticesController {
  constructor(private readonly service: NoticesService) {}

  @Get()
  @ApiOperation({ summary: '공지사항 목록' })
  async list(@Query() query: ListNoticesDto) {
    const { items, total } = await this.service.list(query)
    return {
      data: items,
      meta: { total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 },
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '공지사항 상세' })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const notice = await this.service.getById(id)
    if (!notice) throw new NotFoundException('Notice not found')
    return { data: notice }
  }
}
