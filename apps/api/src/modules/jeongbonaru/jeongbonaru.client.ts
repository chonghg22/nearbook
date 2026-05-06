import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { db, apiUsage } from '@nearbook/db'
import { QuotaService, Priority } from '../quota/quota.service'
import { QuotaBlockedError } from '../quota/quota.errors'
import { PendingLookupService } from './pending-lookup.service'
import { LookupType } from './dedupe-key.util'

interface CallOptions {
  priority?: Priority
  enqueueOnBlock?: {
    lookupType: LookupType
    dedupeKey: string
    payload: Record<string, unknown>
  }
}

@Injectable()
export class JeongbonaruClient {
  private readonly logger = new Logger(JeongbonaruClient.name)
  private readonly client: AxiosInstance

  constructor(
    private readonly config: ConfigService,
    private readonly quota: QuotaService,
    private readonly pendingLookupService: PendingLookupService,
  ) {
    this.client = axios.create({
      baseURL: 'https://www.data4library.kr/api',
      params: {
        authKey: this.config.get('JEONGBONARU_API_KEY'),
        format: 'json',
      },
      timeout: 5000,
    })
  }

  async get<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    options: CallOptions = {},
  ): Promise<T> {
    // QuotaService 게이트는 기존 그대로
    const priority = options.priority ?? 'HIGH'
    const gate = await this.quota.acquire('jeongbonaru', priority)
    if (!gate.ok) {
      this.logger.warn(`Quota blocked: ${gate.reason} (priority=${priority}, endpoint=${endpoint})`)

      // HIGH priority 차단 시에만 enqueue 시도
      if (priority === 'HIGH' && options.enqueueOnBlock) {
        await this.pendingLookupService.enqueue({
          ...options.enqueueOnBlock,
          priority: 'HIGH',
        })
      }

      throw new QuotaBlockedError(gate.reason)
    }

    const start = Date.now()
    try {
      const { data } = await this.client.get<T>(endpoint, { params })
      const durationMs = Date.now() - start

      // 호출 직후 카운트 즉시 +1
      this.quota.bumpCachedCount('jeongbonaru')

      // 호출 로그 (비차단)
      await db.insert(apiUsage).values({
        provider: 'jeongbonaru',
        endpoint,
        statusCode: 200,
        cachedHit: false,
        durationMs,
        priority, // ← options.priority ?? null 대신 resolved priority 사용
      })

      // 임계값 체크 (비차단)
      void this.quota.checkAndNotifyThresholds('jeongbonaru')

      return data
    } catch (err: any) {
      const durationMs = Date.now() - start
      const status = err?.response?.status ?? 500
      this.logger.error(`API call failed: ${endpoint} (${status})`, err.message)

      await db.insert(apiUsage).values({
        provider: 'jeongbonaru',
        endpoint,
        statusCode: status,
        cachedHit: false,
        durationMs,
        priority, // ← resolved priority
      })

      throw err
    }
  }

  async getStatus() {
    return this.quota.getStatus('jeongbonaru')
  }
}
