import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { JeongbonaruClient } from '../services/jeongbonaru.client'

/**
 * 정보나루 API 프록시 — 브라우저에서 직접 테스트용.
 * 모든 파라미터를 query string으로 받아 그대로 정보나루에 전달.
 * authKey, format은 자동 주입됨.
 */
@ApiTags('naru-proxy')
@Controller('naru')
export class JeongbonaruProxyController {
  constructor(private readonly client: JeongbonaruClient) {}

  /** API 1: 정보공개 도서관 조회 */
  @Get('libSrch')
  @ApiOperation({ summary: '도서관 검색' })
  async libSrch(@Query() query: Record<string, string>) {
    return this.client.get('/libSrch', query)
  }

  /** API 2: 도서관별 장서/대출 데이터 조회 */
  @Get('itemSrch')
  @ApiOperation({ summary: '도서관별 장서/대출 데이터 조회' })
  async itemSrch(@Query() query: Record<string, string>) {
    return this.client.get('/itemSrch', query)
  }

  /** API 3: 인기대출도서 조회 */
  @Get('loanItemSrch')
  @ApiOperation({ summary: '인기대출도서 조회' })
  async loanItemSrch(@Query() query: Record<string, string>) {
    return this.client.get('/loanItemSrch', query)
  }

  /** API 4: 마니아를 위한 추천도서 조회 */
  @Get('recommandList')
  @ApiOperation({ summary: '마니아 추천도서' })
  async recommandList(@Query() query: Record<string, string>) {
    return this.client.get('/recommandList', query)
  }

  /** API 5: 다독자를 위한 추천도서 조회 */
  @Get('readerRecBooks')
  @ApiOperation({ summary: '다독자 추천도서' })
  async readerRecBooks(@Query() query: Record<string, string>) {
    return this.client.get('/readerRecBooks', query)
  }

  /** API 6: 도서 상세 */
  @Get('srchDtlList')
  @ApiOperation({ summary: '도서 상세 조회' })
  async srchDtlList(@Query() query: Record<string, string>) {
    return this.client.get('/srchDtlList', query)
  }

  /** API 7: 도서 키워드 목록 */
  @Get('keywordList')
  @ApiOperation({ summary: '도서 키워드 목록' })
  async keywordList(@Query() query: Record<string, string>) {
    return this.client.get('/keywordList', query)
  }

  /** API 8: 도서별 이용 분석 */
  @Get('usageAnalysisList')
  @ApiOperation({ summary: '도서별 이용 분석' })
  async usageAnalysisList(@Query() query: Record<string, string>) {
    return this.client.get('/usageAnalysisList', query)
  }

  /** API 9: 도서관/지역별 인기대출 도서 조회 */
  @Get('loanItemSrchByLib')
  @ApiOperation({ summary: '도서관/지역별 인기대출 도서' })
  async loanItemSrchByLib(@Query() query: Record<string, string>) {
    return this.client.get('/loanItemSrchByLib', query)
  }

  /** API 10: 도서관별 대출반납추이 */
  @Get('usageTrend')
  @ApiOperation({ summary: '도서관별 대출반납추이' })
  async usageTrend(@Query() query: Record<string, string>) {
    return this.client.get('/usageTrend', query)
  }

  /** API 11: 도서관별 도서 소장여부 및 대출 가능여부 조회 */
  @Get('bookExist')
  @ApiOperation({ summary: '도서 소장여부/대출가능여부' })
  async bookExist(@Query() query: Record<string, string>) {
    return this.client.get('/bookExist', query)
  }

  /** API 12: 대출 급상승 도서 */
  @Get('hotTrend')
  @ApiOperation({ summary: '대출 급상승 도서' })
  async hotTrend(@Query() query: Record<string, string>) {
    return this.client.get('/hotTrend', query)
  }

  /** API 13: 도서 소장 도서관 조회 */
  @Get('libSrchByBook')
  @ApiOperation({ summary: '도서 소장 도서관 조회' })
  async libSrchByBook(@Query() query: Record<string, string>) {
    return this.client.get('/libSrchByBook', query)
  }

  /** API 14: 도서관별 통합정보 */
  @Get('libInfo')
  @ApiOperation({ summary: '도서관별 통합정보' })
  async libInfo(@Query() query: Record<string, string>) {
    return this.client.get('/libInfo', query)
  }

  /** API 15: 도서관별 인기대출도서 통합 */
  @Get('loanItemSrchByLibCode')
  @ApiOperation({ summary: '도서관별 인기대출도서 통합' })
  async loanItemSrchByLibCode(@Query() query: Record<string, string>) {
    return this.client.get('/loanItemSrchByLibCode', query)
  }

  /** API 16: 도서 검색 */
  @Get('srchBooks')
  @ApiOperation({ summary: '도서 검색' })
  async srchBooks(@Query() query: Record<string, string>) {
    return this.client.get('/srchBooks', query)
  }

  /** API 17: 이달의 키워드 */
  @Get('monthlyKeywords')
  @ApiOperation({ summary: '이달의 키워드' })
  async monthlyKeywords(@Query() query: Record<string, string>) {
    return this.client.get('/monthlyKeywords', query)
  }

  /** API 18: 지역별 독서량/독서율 */
  @Get('regionReading')
  @ApiOperation({ summary: '지역별 독서량/독서율' })
  async regionReading(@Query() query: Record<string, string>) {
    return this.client.get('/regionReading', query)
  }

  /** API 19: 신착도서 조회 */
  @Get('newArrivalBook')
  @ApiOperation({ summary: '신착도서 조회' })
  async newArrivalBook(@Query() query: Record<string, string>) {
    return this.client.get('/newArrivalBook', query)
  }

  /** API 호출 현황 */
  @Get('status')
  @ApiOperation({ summary: 'API 호출량 현황' })
  async status() {
    return this.client.getStatus()
  }
}
