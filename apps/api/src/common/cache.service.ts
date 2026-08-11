import { Injectable } from '@nestjs/common'
import { LRUCache } from 'lru-cache'

@Injectable()
export class CacheService {
  // LRUCache의 값 타입은 non-nullish여야 한다. `{}`와 동일한 의미의 명시적 타입을 쓴다.
  private readonly cache = new LRUCache<string, NonNullable<unknown>>({
    max: 10_000,
    ttl: 5 * 60 * 1000,
  })

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  set<T>(key: string, value: T, ttlMs = 5 * 60 * 1000) {
    this.cache.set(key, value as NonNullable<unknown>, { ttl: ttlMs })
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  get size() {
    return this.cache.size
  }
}
