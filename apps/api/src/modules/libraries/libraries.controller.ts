import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { LibrariesService } from './libraries.service'
import { ListQueryDto } from './dto/list-query.dto'

@ApiTags('libraries')
@Controller('libraries')
export class LibrariesController {
  constructor(private readonly service: LibrariesService) {}

  @Get()
  @ApiOperation({ summary: '도서관 목록 (페이지네이션 + 지역 필터 + 이름 검색)' })
  list(@Query() query: ListQueryDto) {
    if (query.q) {
      return this.service.search(query.q, query.limit ?? 10)
    }
    return this.service.list(query.page, query.limit, query.region)
  }

  @Get('in-bounds')
  @ApiOperation({ summary: 'viewport bounds 내 도서관 목록' })
  inBounds(
    @Query('swLat') swLat: string,
    @Query('swLng') swLng: string,
    @Query('neLat') neLat: string,
    @Query('neLng') neLng: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.service.findInBounds({
      swLat: parseFloat(swLat),
      swLng: parseFloat(swLng),
      neLat: parseFloat(neLat),
      neLng: parseFloat(neLng),
      limit: Math.min(limit, 200),
    })
  }

  @Get('by-region')
  @ApiOperation({ summary: '시도/시군구 기준 도서관 목록 (좌표 포함)' })
  byRegion(
    @Query('sido') sido: string,
    @Query('sigungu') sigungu?: string,
  ) {
    return this.service.findByRegionWithSigungu(sido, sigungu)
  }

  @Get('regions')
  @ApiOperation({ summary: '시도/구군 목록 (필터용)' })
  listRegions() {
    return this.service.listRegions()
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

  @Get('popular')
  @ApiOperation({ summary: '인기 도서관' })
  listPopular(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.service.getPopular(limit)
  }

  @Get('featured-new-arrivals')
  @ApiOperation({ summary: '신착도서 데이터가 있는 대표 도서관 목록' })
  listFeaturedNewArrivals(
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ) {
    return this.service.getFeaturedNewArrivalLibraries(limit)
  }

  @Get(':id')
  @ApiOperation({ summary: '도서관 상세' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.getById(id)
    return { data }
  }

  @Get(':id/popular')
  @ApiOperation({ summary: '도서관별 인기 대출 도서' })
  async getLibraryPopular(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const data = await this.service.getPopularBooks(id, limit)
    return { data }
  }

  @Get(':id/recent')
  @ApiOperation({ summary: '도서관별 최근 30일 신간' })
  async getLibraryRecent(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const data = await this.service.getRecentBooks(id, limit)
    return { data }
  }

  @Get(':id/new-arrivals')
  @ApiOperation({ summary: '도서관별 신착도서' })
  async getLibraryNewArrivals(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('searchDt') searchDt?: string,
  ) {
    const data = await this.service.getNewArrivalBooks(id, Math.min(limit, 50), searchDt)
    return { data }
  }

  @Get(':id/trends')
  @ApiOperation({ summary: '도서관별 대출반납 추이' })
  async getLibraryTrends(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.getUsageTrend(id)
    return { data }
  }
}
