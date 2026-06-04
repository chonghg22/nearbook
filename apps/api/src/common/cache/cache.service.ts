import { Injectable } from '@nestjs/common'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

@Injectable()
export class CacheService {
  private readonly maxEntries = 10_000
  private readonly defaultTtlMs = 5 * 60 * 1000
  private readonly cache = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      return undefined
    }
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  get size(): number {
    return this.cache.size
  }
}
