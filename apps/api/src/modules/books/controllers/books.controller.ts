import { Controller, Get, Param, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { BooksService } from '../services/books.service'

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly service: BooksService) {}

  @Get('popular')
  @ApiOperation({ summary: '인기 대출 도서' })
  async getPopular(
    @Query('region', new DefaultValuePipe('전국')) region: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = Math.min(limit, 5000)
    const data = await this.service.getPopular(region, limit)
    return { data }
  }

  @Get('recent')
  @ApiOperation({ summary: '최신 도서' })
  async getRecent(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const data = await this.service.getRecent(limit)
    return { data }
  }

  @Get('loan-item')
  @ApiOperation({ summary: '정보나루 인기대출도서' })
  async getLoanItemBooks(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const data = await this.service.getLoanItemBooks(Math.min(limit, 20))
    return { data }
  }

  @Get('hot-trend')
  @ApiOperation({ summary: '정보나루 대출 급상승도서' })
  async getHotTrendBooks(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('searchDt') searchDt?: string,
  ) {
    const data = await this.service.getHotTrendBooks(Math.min(limit, 20), searchDt)
    return { data }
  }

  @Get('categories')
  @ApiOperation({ summary: '캐시된 도서 카테고리 목록' })
  async getCategories(
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    const data = await this.service.getCategories(Math.min(limit, 100))
    return { data }
  }

  @Get('by-category')
  @ApiOperation({ summary: '카테고리별 캐시 도서' })
  async getByCategory(
    @Query('categoryCode') categoryCode: string,
    @Query('limit', new DefaultValuePipe(40), ParseIntPipe) limit: number,
  ) {
    const data = categoryCode ? await this.service.getByCategory(categoryCode, Math.min(limit, 100)) : []
    return { data }
  }

  @Get(':isbn/analysis')
  @ApiOperation({ summary: '도서별 이용 분석' })
  async getUsageAnalysis(@Param('isbn') isbn: string) {
    const data = await this.service.getUsageAnalysis(isbn)
    return { data }
  }

  @Get(':isbn/with-libraries')
  @ApiOperation({ summary: '책 + 주변 도서관 보유 + affiliate' })
  getWithLibraries(
    @Param('isbn') isbn: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius', new DefaultValuePipe(5), ParseIntPipe) radius: number,
  ) {
    const defaultLat = parseFloat(lat) || 37.5665
    const defaultLng = parseFloat(lng) || 126.978
    return this.service.getWithLibraries(isbn, defaultLat, defaultLng, radius)
  }

  @Get(':isbn')
  @ApiOperation({ summary: '책 상세 (ISBN)' })
  getByIsbn(@Param('isbn') isbn: string) {
    return this.service.getByIsbn(isbn)
  }
}
