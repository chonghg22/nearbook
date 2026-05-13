import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { db, bookCache, apiUsage } from '@nearbook/db'

@Injectable()
export class AladdinFallbackService {
  private readonly logger = new Logger(AladdinFallbackService.name)
  private readonly key: string
  private dailyCount = 0
  private dailyResetAt = Date.now() + 86400_000

  constructor(private readonly config: ConfigService) {
    this.key = this.config.get<string>('ALADIN_TTB_KEY') ?? ''
  }

  async searchAndCache(query: string): Promise<any[]> {
    if (!this.key) {
      this.logger.warn('ALADIN_TTB_KEY not set — skipping fallback')
      return []
    }

    // 일 한도 가드 (5,000건의 80%)
    if (Date.now() > this.dailyResetAt) {
      this.dailyCount = 0
      this.dailyResetAt = Date.now() + 86400_000
    }
    if (this.dailyCount > 4000) {
      this.logger.warn(`Aladdin quota near limit: ${this.dailyCount}/5000 — skipping`)
      return []
    }

    const url = new URL('http://www.aladin.co.kr/ttb/api/ItemSearch.aspx')
    url.searchParams.set('ttbkey', this.key)
    url.searchParams.set('Query', query)
    url.searchParams.set('QueryType', 'Title')
    url.searchParams.set('MaxResults', '10')
    url.searchParams.set('SearchTarget', 'Book')
    url.searchParams.set('Output', 'JS')
    url.searchParams.set('Version', '20131101')
    url.searchParams.set('Cover', 'Big')

    const t0 = Date.now()
    let resp: any
    let statusCode = 200
    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
      statusCode = res.status
      resp = await res.json()
      this.dailyCount++
    } catch (e) {
      this.logger.warn(`Aladdin failed: ${e}`)
      statusCode = 0
      return []
    } finally {
      await db.insert(apiUsage).values({
        provider: 'aladdin',
        endpoint: 'ItemSearch',
        statusCode,
        durationMs: Date.now() - t0,
        cachedHit: false,
      }).catch(() => {})
    }

    const items = (resp?.item ?? []) as any[]
    const normalized = items
      .map(this.normalize)
      .filter(b => b.isbn && /^97[89]\d{10}$/.test(b.isbn))

    if (normalized.length === 0) return []

    // book_cache upsert (365일 캐시 — 책 메타데이터는 거의 변하지 않음)
    const expiresAt = new Date(Date.now() + 365 * 86400_000)
    await Promise.allSettled(
      normalized.map(b =>
        db.insert(bookCache).values({ ...b, cachedAt: new Date(), expiresAt })
          .onConflictDoUpdate({
            target: bookCache.isbn,
            set: { ...b, cachedAt: new Date(), expiresAt },
          }),
      ),
    )

    return normalized
  }

  private normalize(it: any) {
    return {
      isbn: it.isbn13 || it.isbn,
      title: it.title,
      author: it.author,
      publisher: it.publisher,
      publishedYear: Number((it.pubDate ?? '').slice(0, 4)) || null,
      coverUrl: it.cover,
      summary: it.description,
      category: it.categoryName?.split('>').pop()?.trim() ?? null,
      aladinItemId: String(it.itemId ?? ''),
    }
  }
}
