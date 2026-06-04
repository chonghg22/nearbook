import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'

type AdmissionMode = 'memory' | 'redis' | 'off'

export interface AdmissionResult {
  allowed: boolean
  mode: AdmissionMode
  waitedMs: number
  retryAfterMs: number
}

interface RedisClient {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  quit(): Promise<unknown>
}

@Injectable()
export class EventApplicationAdmissionService implements OnModuleDestroy {
  private readonly logger = new Logger(EventApplicationAdmissionService.name)
  private readonly mode = this.readMode()
  private readonly perSecond = this.readPositiveInt('EVENT_ADMISSION_PER_SECOND', 20)
  private readonly waitMs = this.readPositiveInt('EVENT_ADMISSION_WAIT_MS', 1500)
  private readonly retryStepMs = this.readPositiveInt('EVENT_ADMISSION_RETRY_STEP_MS', 100)
  private readonly memoryWindows = new Map<string, { count: number; expiresAt: number }>()
  private redis: RedisClient | null = null

  constructor() {
    if (this.mode === 'redis') {
      this.redis = this.createRedisClient()
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined)
    }
  }

  async waitForTurn(programId: number, userId: number): Promise<AdmissionResult> {
    if (this.mode === 'off') {
      return { allowed: true, mode: 'off', waitedMs: 0, retryAfterMs: 0 }
    }

    const startedAt = Date.now()

    while (Date.now() - startedAt <= this.waitMs) {
      const allowed = this.mode === 'redis'
        ? await this.tryAcquireRedis(programId)
        : this.tryAcquireMemory(programId)

      if (allowed) {
        return {
          allowed: true,
          mode: this.mode,
          waitedMs: Date.now() - startedAt,
          retryAfterMs: 0,
        }
      }

      await this.sleep(this.retryStepMs)
    }

    this.logger.warn(`Admission timeout: program=${programId} user=${userId} mode=${this.mode}`)
    return {
      allowed: false,
      mode: this.mode,
      waitedMs: Date.now() - startedAt,
      retryAfterMs: this.retryStepMs,
    }
  }

  private async tryAcquireRedis(programId: number) {
    if (!this.redis) return false

    const key = this.windowKey(programId)
    const count = await this.redis.incr(key)
    if (count === 1) {
      await this.redis.expire(key, 2)
    }

    return count <= this.perSecond
  }

  private tryAcquireMemory(programId: number) {
    const now = Date.now()
    const key = this.windowKey(programId)
    const current = this.memoryWindows.get(key)

    if (!current || current.expiresAt <= now) {
      this.memoryWindows.set(key, { count: 1, expiresAt: now + 1000 })
      this.cleanupMemoryWindows(now)
      return true
    }

    if (current.count >= this.perSecond) return false

    current.count += 1
    return true
  }

  private windowKey(programId: number) {
    return `event:admission:${programId}:${Math.floor(Date.now() / 1000)}`
  }

  private cleanupMemoryWindows(now: number) {
    for (const [key, value] of this.memoryWindows) {
      if (value.expiresAt <= now) this.memoryWindows.delete(key)
    }
  }

  private createRedisClient(): RedisClient {
    const url = process.env.REDIS_URL
    if (!url) {
      throw new Error('REDIS_URL is required when EVENT_ADMISSION_MODE=redis')
    }

    try {
      const Redis = require('ioredis')
      return new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: false,
      }) as RedisClient
    } catch (err) {
      throw new Error(`ioredis is required when EVENT_ADMISSION_MODE=redis: ${(err as Error).message}`)
    }
  }

  private readMode(): AdmissionMode {
    const value = process.env.EVENT_ADMISSION_MODE ?? 'memory'
    if (value === 'redis' || value === 'off' || value === 'memory') return value
    return 'memory'
  }

  private readPositiveInt(name: string, fallback: number) {
    const value = Number(process.env[name])
    return Number.isFinite(value) && value > 0 ? value : fallback
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
