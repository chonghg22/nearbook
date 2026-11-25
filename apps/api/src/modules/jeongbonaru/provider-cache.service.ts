import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { createHash, randomUUID } from 'crypto'
import { db, sql } from '@nearbook/db'

export type CacheInfo = { fetchedAt: string; stale: boolean }
export type CachedResponse<T> = T & { cacheInfo?: CacheInfo }
type Row = { payload: unknown; fetched_at: Date | null; fresh: boolean }

/** Shared response cache and bounded lease, separate from the client's process single-flight. */
@Injectable()
export class ProviderCacheService {
  key(endpoint: string, params: Record<string, unknown>) {
    return createHash('sha256').update(JSON.stringify([endpoint,
      Object.keys(params).sort().map((key) => [key, params[key]])])).digest('hex')
  }

  private async read(key: string): Promise<Row | undefined> {
    const rows = await db.execute(sql`SELECT payload, fetched_at, expires_at > now() AS fresh
      FROM nearbook.provider_response_cache WHERE cache_key = ${key}`)
    return rows[0] as Row | undefined
  }

  async peek<T>(endpoint: string, params: Record<string, unknown>): Promise<CachedResponse<T> | undefined> {
    const row = await this.read(this.key(endpoint, params))
    return row?.payload != null && row.fresh ? this.value<T>(row) : undefined
  }

  private value<T>(row: Row): CachedResponse<T> {
    return { ...(row.payload as T), cacheInfo: {
      fetchedAt: new Date(row.fetched_at!).toISOString(), stale: !row.fresh,
    } }
  }

  async get<T>(endpoint: string, params: Record<string, unknown>, fetch: () => Promise<T>, ttlSeconds: number): Promise<CachedResponse<T>> {
    const key = this.key(endpoint, params)
    let row = await this.read(key)
    if (row?.payload != null && row.fresh) return this.value<T>(row)
    const token = randomUUID()
    const claimed = await db.execute(sql`INSERT INTO nearbook.provider_response_cache
      (cache_key, lease_token, lease_until) VALUES (${key}, ${token}, now() + interval '40 seconds')
      ON CONFLICT (cache_key) DO UPDATE SET lease_token = EXCLUDED.lease_token, lease_until = EXCLUDED.lease_until
      WHERE (provider_response_cache.lease_until IS NULL OR provider_response_cache.lease_until <= now())
        AND provider_response_cache.retry_after <= now()
        AND (provider_response_cache.payload IS NULL OR provider_response_cache.expires_at <= now())
      RETURNING cache_key`)
    if (!claimed.length) {
      // A stale success is immediately usable while another process updates it.
      if (row?.payload != null) return this.value<T>(row)
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        row = await this.read(key)
        if (row?.payload != null) return this.value<T>(row)
      }
      throw new ServiceUnavailableException('도서 정보를 준비하고 있습니다. 잠시 후 다시 시도해 주세요.')
    }
    try {
      const payload = await fetch()
      const encoded = JSON.stringify(payload)
      if (Buffer.byteLength(encoded) > 2_000_000) throw new Error('PROVIDER_RESPONSE_TOO_LARGE')
      const written = await db.execute(sql`UPDATE nearbook.provider_response_cache
        SET payload = ${encoded}::jsonb, fetched_at = now(),
          expires_at = now() + ${ttlSeconds} * interval '1 second',
          retry_after = '-infinity', lease_token = NULL, lease_until = NULL
        WHERE cache_key = ${key} AND lease_token = ${token} RETURNING payload, fetched_at, true AS fresh`)
      if (!written.length) throw new Error('CACHE_LEASE_LOST')
      return this.value<T>(written[0] as Row)
    } catch (error) {
      // Do not replace successful content or turn transport/quota errors into an empty result.
      await db.execute(sql`UPDATE nearbook.provider_response_cache
        SET retry_after = now() + interval '30 seconds', lease_token = NULL, lease_until = NULL
        WHERE cache_key = ${key} AND lease_token = ${token}`).catch(() => {})
      if (row?.payload != null) return this.value<T>(row)
      throw error
    }
  }
}
