import { Controller, Get, Param, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { BooksService } from './books.service'

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly service: BooksService) {}

  @Get('popular')
  @ApiOperation({ summary: '인기 대출 도서' })
  getPopular(
    @Query('region', new DefaultValuePipe('전국')) region: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    limit = Math.min(limit, 5000)
    return this.service.getPopular(region, limit)
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
