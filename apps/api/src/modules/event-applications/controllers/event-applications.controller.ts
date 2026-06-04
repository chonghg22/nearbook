import {
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AuthGuard, OptionalAuthGuard } from '../../auth/guards/auth.guard'
import { EventApplicationsService } from '../services/event-applications.service'
import { ListEventProgramsDto } from '../dto/list-event-programs.dto'

@ApiTags('event-applications')
@Controller()
export class EventApplicationsController {
  constructor(private readonly service: EventApplicationsService) {}

  @Get('event-programs')
  @ApiOperation({ summary: '도서관 문화행사 목록' })
  async list(@Query() query: ListEventProgramsDto) {
    const { items, total } = await this.service.listPrograms(query)
    return {
      data: items,
      meta: { total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 },
    }
  }

  @Get('event-programs/:id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: '도서관 문화행사 상세' })
  async getOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const data = await this.service.getProgram(id, req.user?.supabaseUserId ?? null)
    return { data }
  }

  @Post('event-programs/:id/applications')
  @HttpCode(202)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ short: { limit: 5, ttl: 10_000 }, medium: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: '문화행사 신청 접수 (큐 기반)' })
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const result = await this.service.apply(
      id,
      req.user.supabaseUserId,
      req.user.email,
      idempotencyKey,
    )
    return { data: result.application, meta: { admission: result.admission } }
  }

  @Delete('event-programs/:id/applications/me')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 문화행사 신청 취소' })
  async cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.service.cancel(id, req.user.supabaseUserId)
  }

  @Get('me/event-applications')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 문화행사 신청 목록' })
  async listMine(@Req() req: any) {
    const items = await this.service.listMine(req.user.supabaseUserId)
    return { data: items, meta: { total: items.length } }
  }
}
