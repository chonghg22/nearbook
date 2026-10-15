import { HttpException, HttpStatus } from '@nestjs/common'

export type QuotaBlockReason = 'QUOTA_BLOCKED_LOW' | 'QUOTA_BLOCKED_ALL'

export class QuotaBlockedError extends HttpException {
  constructor(public readonly reason: QuotaBlockReason) {
    super('API_LIMIT_EXCEEDED', HttpStatus.TOO_MANY_REQUESTS)
    this.name = 'QuotaBlockedError'
  }
}

export class QuotaAccountingUnavailableError extends HttpException {
  constructor() {
    super('QUOTA_ACCOUNTING_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE)
    this.name = 'QuotaAccountingUnavailableError'
  }
}
