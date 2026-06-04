export type QuotaBlockReason = 'QUOTA_BLOCKED_LOW' | 'QUOTA_BLOCKED_ALL'

export class QuotaBlockedError extends Error {
  constructor(public readonly reason: QuotaBlockReason) {
    super(reason)
    this.name = 'QuotaBlockedError'
  }
}
