import { Injectable } from '@nestjs/common'
import { LRUCache } from 'lru-cache'

@Injectable()
export class CacheService {
  private hits = 0
  private misses = 0
  private readonly cache = new LRUCache<string, NonNullable<unknown>>({
    max: 10_000,
    ttl: 5 * 60 * 1000, // 5분 기본
  })

  get<T>(key: string): T | undefined {
    const value = this.cache.get(key)
    if (value === undefined) this.misses++
    else this.hits++
    return value as T | undefined
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (ttlMs !== undefined) {
      this.cache.set(key, value as NonNullable<unknown>, { ttl: ttlMs })
    } else {
      this.cache.set(key, value as NonNullable<unknown>)
    }
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  get size(): number {
    this.cache.purgeStale()
    return this.cache.size
  }

  getStatus() {
    this.cache.purgeStale()
    return {
      scope: 'shared-process-memory',
      size: this.cache.size,
      max: 10000,
      hits: this.hits,
      misses: this.misses,
      counters: 'current-process-only',
    }
  }
}
