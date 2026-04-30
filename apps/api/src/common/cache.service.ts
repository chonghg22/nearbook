import { Injectable } from '@nestjs/common'
import { LRUCache } from 'lru-cache'

@Injectable()
export class CacheService {
  private readonly cache = new LRUCache<string, {}>({
    max: 10_000,
    ttl: 5 * 60 * 1000,
  })

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  set<T>(key: string, value: T, ttlMs = 5 * 60 * 1000) {
    this.cache.set(key, value as {}, { ttl: ttlMs })
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  get size() {
    return this.cache.size
  }
}
