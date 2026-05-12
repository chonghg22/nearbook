import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SearchService } from './search.service'
import { SearchQueryDto } from './dto/search-query.dto'
import { HomeCurationsService } from '../home-curations/home-curations.service'

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    private service: SearchService,
    private homeCurations: HomeCurationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: '책 검색 (Orama + 알라딘 TTB fallback)' })
  async search(@Query() query: SearchQueryDto) {
    return { data: await this.service.search(query) }
  }

  @Get('suggest')
  @ApiOperation({ summary: '검색 자동완성 (2글자 이상)' })
  async suggest(@Query('q') q: string) {
    if (!q || q.length < 2) return { data: [] }
    return { data: await this.service.suggest(q) }
  }

  @Get('trending')
  @ApiOperation({ summary: '인기 검색어' })
  async trending(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ): Promise<string[]> {
    return this.service.getTrending(Math.min(limit, 20))
  }

  @Get('monthly-keywords')
  @ApiOperation({ summary: '이달의 키워드' })
  async monthlyKeywords(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('month') month?: string,
  ) {
    return {
      data: await this.homeCurations.getMonthlyKeywords(Math.min(limit, 10), month),
    }
  }
}
