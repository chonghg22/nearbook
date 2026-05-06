import { Injectable } from '@nestjs/common'
import { LRUCache } from 'lru-cache'

@Injectable()
export class CacheService {
  private readonly cache = new LRUCache<string, any>({
    max: 10_000,
    ttl: 5 * 60 * 1000, // 5분 기본
  })

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (ttlMs !== undefined) {
      this.cache.set(key, value, { ttl: ttlMs })
    } else {
      this.cache.set(key, value)
    }
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  get size(): number {
    return this.cache.size
  }
}
