import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance, isAxiosError } from 'axios'
import { AcquisitionScope, QuotaService } from '../quota/quota.service'
import { ProviderCacheService } from './provider-cache.service'
import { Priority, positiveInteger } from '../quota/quota-policy'

type RequestOptions = { timeoutMs?: number; priority?: Priority; scope?: AcquisitionScope }
const SHARED_TTL: Record<string, number> = {
  '/srchBooks': 900, '/usageAnalysisList': 86400, '/usageTrend': 21600, '/loanItemSrch': 21600,
}

@Injectable()
export class JeongbonaruClient implements OnModuleInit {
  private readonly logger = new Logger(JeongbonaruClient.name)
  private client!: AxiosInstance
  private timeoutMs = 30000
  private authKey: string | undefined
  private readonly inflight = new Map<string, Promise<unknown>>()
  constructor(
    private readonly config: ConfigService,
    private readonly quota: QuotaService,
    private readonly shared: ProviderCacheService,
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
    const priority = options.priority ?? 'HIGH'
    if (priority !== 'HIGH' && priority !== 'LOW')
      return Promise.reject(new Error('INVALID_PROVIDER_PRIORITY'))
    // A shared-cache lease lasts 40s; transport must finish before another owner can take over.
    const timeoutMs = Math.min(this.timeoutMs, positiveInteger(options.timeoutMs, this.timeoutMs),
      SHARED_TTL[endpoint] ? 30000 : this.timeoutMs)
    // User-supplied proxy query params must not override the configured key or JSON envelope.
    const safeParams = { ...params }
    delete safeParams.authKey
    delete safeParams.format
    const key = JSON.stringify([
      endpoint,
      priority,
      timeoutMs, options.scope ?? 'refresh',
      Object.keys(safeParams)
        .sort()
        .map((name) => [name, safeParams[name]]),
    ])
    const existing = this.inflight.get(key)
    if (existing) return existing as Promise<T>
    const dispatch = () => this.dispatch<T>(endpoint, safeParams, priority, timeoutMs, options.scope ?? 'refresh')
    const request = SHARED_TTL[endpoint]
      ? this.shared.get<T>(endpoint, safeParams, dispatch, SHARED_TTL[endpoint])
      : dispatch()
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
    timeoutMs: number,
    scope: AcquisitionScope
  ): Promise<T> {
    if (!this.authKey) throw new Error('PROVIDER_NOT_CONFIGURED')
    const reservationId = await this.quota.acquire('jeongbonaru', priority, endpoint, scope)
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
      if (SHARED_TTL[endpoint]) this.validateCacheable(endpoint, data, params)
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

  peekBook(isbn: string) {
    return this.shared.peek<import('./jeongbonaru.types').JeongbonaruDocsResponse>(
      '/srchBooks', { isbn13: isbn, pageNo: 1, pageSize: 1 })
  }

  private validateCacheable(endpoint: string, data: unknown, params: Record<string, unknown>) {
    const response = (data as { response?: Record<string, unknown> } | null)?.response
    if (!response || typeof response !== 'object') throw new Error('INVALID_PROVIDER_RESPONSE')
    if (['/srchBooks', '/loanItemSrch'].includes(endpoint) && !Array.isArray(response.docs))
      throw new Error('INVALID_PROVIDER_RESPONSE')
    if (Array.isArray(response.docs) && response.docs.some((entry: { doc?: { bookname?: unknown; isbn13?: unknown } }) =>
      typeof entry?.doc?.bookname !== 'string' || !entry.doc.bookname.trim() ||
      (endpoint === '/srchBooks' && params.isbn13 && entry.doc.isbn13 !== params.isbn13)))
      throw new Error('INVALID_PROVIDER_RESPONSE')
    if (endpoint === '/usageTrend' && !Array.isArray(response.results))
      throw new Error('INVALID_PROVIDER_RESPONSE')
    if (endpoint === '/usageTrend' && (response.results as unknown[]).some((entry) => {
      const row = (entry as { result?: unknown } | null)?.result ?? entry
      return !row || typeof row !== 'object' || Array.isArray(row) ||
        !['dayOfWeek', 'hour', 'loan', 'return'].some((key) => key in row)
    })) throw new Error('INVALID_PROVIDER_RESPONSE')
    if (endpoint === '/usageAnalysisList' && !('book' in response || 'loanHistory' in response || 'loanGrps' in response))
      throw new Error('INVALID_PROVIDER_RESPONSE')
    if (endpoint === '/usageAnalysisList') {
      const object = (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value)
      if (response.book != null && !object(response.book)) throw new Error('INVALID_PROVIDER_RESPONSE')
      for (const [name, wrapper] of Object.entries({ loanHistory: 'loan', loanGrps: 'loanGrp', keywords: 'keyword',
        coLoanBooks: 'book', maniaRecBooks: 'book', readerRecBooks: 'book' })) {
        const value = response[name]
        if (value == null) continue
        const entries = Array.isArray(value) ? value : [value]
        if (entries.some((entry) => !object(entry) || !object(entry[wrapper] ?? entry)))
          throw new Error('INVALID_PROVIDER_RESPONSE')
      }
    }
  }

  private extractApiError(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const response = (data as { response?: unknown }).response
    if (!response || typeof response !== 'object') return null
    const error = (response as { error?: unknown }).error
    return typeof error === 'string' ? error.trim() || null : error == null ? null : 'PROVIDER_ERROR'
  }
}
