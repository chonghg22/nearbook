import { Controller, Get, Param } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { JeongbonaruClient } from './modules/jeongbonaru/jeongbonaru.client'
import { JeongbonaruService } from './modules/jeongbonaru/jeongbonaru.service'

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly jeongbonaruClient: JeongbonaruClient,
    private readonly jeongbonaruService: JeongbonaruService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: '서버 상태 확인' })
  getHealth() {
    return {
      status: 'ok',
      time: new Date().toISOString(),
      jeongbonaru: this.jeongbonaruClient.getStatus(),
    }
  }

  @Get('books/isbn/:isbn')
  @ApiOperation({ summary: 'ISBN으로 책 캐시/정보나루 조회' })
  getBookByIsbn(@Param('isbn') isbn: string) {
    return this.jeongbonaruService.getBookByIsbn(isbn)
  }
}
