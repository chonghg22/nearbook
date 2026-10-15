import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance, isAxiosError } from 'axios'
import { QuotaService } from '../quota/quota.service'
import { Priority, positiveInteger } from '../quota/quota-policy'

type RequestOptions = { timeoutMs?: number; priority?: Priority }

@Injectable()
export class JeongbonaruClient implements OnModuleInit {
  private readonly logger = new Logger(JeongbonaruClient.name)
  private client!: AxiosInstance
  private timeoutMs = 30000
  private authKey: string | undefined
  private readonly inflight = new Map<string, Promise<unknown>>()
  constructor(
    private readonly config: ConfigService,
    private readonly quota: QuotaService
  ) {}
  onModuleInit(): void {
    this.authKey = this.config.get<string>('JEONGBONARU_API_KEY')
    if (!this.authKey) this.logger.warn('JEONGBONARU_API_KEY missing; provider dispatch disabled')
    this.timeoutMs = positiveInteger(this.config.get('JEONGBONARU_TIMEOUT_MS'), 30000)
    this.client = axios.create({
      baseURL: 'https://www.data4library.kr/api',
      timeout: this.timeoutMs,
    })
  }

  get<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    options: RequestOptions = {}
  ): Promise<T> {
    if (!/^\/[a-zA-Z][a-zA-Z0-9]*$/.test(endpoint))
      return Promise.reject(new Error('INVALID_PROVIDER_ENDPOINT'))
    if (!this.authKey) return Promise.reject(new Error('PROVIDER_NOT_CONFIGURED'))
    const priority = options.priority ?? 'HIGH'
    if (priority !== 'HIGH' && priority !== 'LOW')
      return Promise.reject(new Error('INVALID_PROVIDER_PRIORITY'))
    const timeoutMs = Math.min(this.timeoutMs, positiveInteger(options.timeoutMs, this.timeoutMs))
    // User-supplied proxy query params must not override the configured key or JSON envelope.
    const safeParams = { ...params }
    delete safeParams.authKey
    delete safeParams.format
    const key = JSON.stringify([
      endpoint,
      priority,
      timeoutMs,
      Object.keys(safeParams)
        .sort()
        .map((name) => [name, safeParams[name]]),
    ])
    const existing = this.inflight.get(key)
    if (existing) return existing as Promise<T>
    const request = this.dispatch<T>(endpoint, safeParams, priority, timeoutMs)
    // Bounded single-flight only, no new long-lived content/PII cache.
    if (this.inflight.size < 500) {
      this.inflight.set(key, request)
      void request
        .finally(() => {
          if (this.inflight.get(key) === request) this.inflight.delete(key)
        })
        .catch(() => {})
    }
    return request
  }

  private async dispatch<T>(
    endpoint: string,
    params: Record<string, unknown>,
    priority: Priority,
    timeoutMs: number
  ): Promise<T> {
    const reservationId = await this.quota.acquire('jeongbonaru', priority, endpoint)
    const start = Date.now()
    let statusCode = 500
    try {
      const { data } = await this.client.get<T>(endpoint, {
        params: { ...params, authKey: this.authKey, format: 'json' },
        timeout: timeoutMs,
      })
      const appError = this.extractApiError(data)
      if (appError) {
        statusCode = 422
        // Safe error only. Provider text may contain the URL/key and is never logged/returned.
        throw new Error('JEONGBONARU_APP_ERROR')
      }
      statusCode = 200
      return data
    } catch (error) {
      if (isAxiosError(error)) statusCode = error.response?.status ?? 500
      this.logger.warn('provider request failed: ' + endpoint + ' status=' + statusCode)
      throw error
    } finally {
      // Budget is already durable. Outcome logging must not stall a successful provider response.
      void this.quota.complete(reservationId, statusCode, Date.now() - start).catch(() => {
        this.logger.error('provider outcome recording failed; reservation retained')
      })
    }
  }

  async getStatus() {
    try {
      return await this.quota.getStatus()
    } catch {
      throw new ServiceUnavailableException('Provider usage status is temporarily unavailable')
    }
  }
  getLocalStatus() {
    return this.quota.getLocalStatus()
  }

  private extractApiError(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const response = (data as { response?: unknown }).response
    if (!response || typeof response !== 'object') return null
    const error = (response as { error?: unknown }).error
    return typeof error === 'string' && error.trim() ? error.trim() : null
  }
}
