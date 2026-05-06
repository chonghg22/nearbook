import { Controller, Get, Param } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { JeongbonaruClient } from './modules/jeongbonaru/jeongbonaru.client'
import { JeongbonaruService } from './modules/jeongbonaru/jeongbonaru.service'
import { PendingLookupService } from './modules/jeongbonaru/pending-lookup.service'

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly jeongbonaruClient: JeongbonaruClient,
    private readonly jeongbonaruService: JeongbonaruService,
    private readonly pendingLookupService: PendingLookupService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: '서버 상태 확인' })
  async getHealth() {
    const [quota, pending] = await Promise.all([
      this.jeongbonaruClient.getStatus(),
      this.pendingLookupService.getStats(),
    ])

    return {
      status: 'ok',
      time: new Date().toISOString(),
      providers: {
        jeongbonaru: quota,
      },
      pendingLookups: {
        pending: pending.pending,
        failed: pending.failed,
        oldestRequestedAt: pending.oldestRequestedAt?.toISOString() ?? null,
      },
    }
  }

  @Get('books/isbn/:isbn')
  @ApiOperation({ summary: 'ISBN으로 책 캐시/정보나루 조회' })
  getBookByIsbn(@Param('isbn') isbn: string) {
    return this.jeongbonaruService.getBookByIsbn(isbn)
  }
}
