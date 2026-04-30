import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { LibrariesService } from './libraries.service'

@ApiTags('libraries')
@Controller('libraries')
export class LibrariesController {
  constructor(private readonly service: LibrariesService) {}

  @Get()
  @ApiOperation({ summary: '도서관 목록 (페이지네이션)' })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.list(page, limit)
  }

  @Get('near')
  @ApiOperation({ summary: '위치 기반 반경 도서관 (PostGIS)' })
  findNear(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius', new DefaultValuePipe(5), ParseIntPipe) radius: number,
  ) {
    return this.service.findNear(parseFloat(lat), parseFloat(lng), radius)
  }

  @Get(':id')
  @ApiOperation({ summary: '도서관 상세' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id)
  }
}
