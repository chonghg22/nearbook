import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SearchService } from './search.service'
import { SearchQueryDto } from './dto/search-query.dto'

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private service: SearchService) {}

  @Get()
  @ApiOperation({ summary: '책 검색 (pg_trgm + 정보나루 fallback)' })
  async search(@Query() query: SearchQueryDto) {
    return { data: await this.service.search(query) }
  }

  @Get('suggest')
  @ApiOperation({ summary: '검색 자동완성 (2글자 이상)' })
  async suggest(@Query('q') q: string) {
    if (!q || q.length < 2) return { data: [] }
    return { data: await this.service.suggest(q) }
  }
}
