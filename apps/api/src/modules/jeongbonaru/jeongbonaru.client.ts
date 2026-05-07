import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance, isAxiosError } from 'axios'
import { db, apiUsage } from '@nearbook/db'

@Injectable()
export class JeongbonaruClient implements OnModuleInit {
  private readonly logger = new Logger(JeongbonaruClient.name)
  private client!: AxiosInstance
  private dailyCallCount = 0
  private DAILY_LIMIT = 30_000

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const authKey = this.config.get<string>('JEONGBONARU_API_KEY')
    if (!authKey) {
      this.logger.warn('JEONGBONARU_API_KEY 미설정 — API 호출은 모두 실패한다')
    }
    this.DAILY_LIMIT =
      this.config.get<number>('JEONGBONARU_DAILY_LIMIT') ?? 500

    this.client = axios.create({
      baseURL: 'https://www.data4library.kr/api',
      params: {
        authKey,
        format: 'json',
      },
      timeout: 10_000,
    })
  }

  /**
   * 정보나루 GET 호출. 호출량 추적 + api_usage 로깅.
   * 한도 도달 시 Error('API_LIMIT_EXCEEDED')
   */
  async get<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    _options: Record<string, unknown> = {},
  ): Promise<T> {
    if (this.dailyCallCount >= this.DAILY_LIMIT) {
      this.logger.warn(
        `API limit reached: ${this.dailyCallCount}/${this.DAILY_LIMIT}`,
      )
      throw new Error('API_LIMIT_EXCEEDED')
    }

    if (
      this.dailyCallCount > 0 &&
      this.dailyCallCount === Math.floor(this.DAILY_LIMIT * 0.9)
    ) {
      this.logger.warn(
        `API 호출 90% 도달: ${this.dailyCallCount}/${this.DAILY_LIMIT}`,
      )
    }

    const start = Date.now()
    this.dailyCallCount++

    try {
      const { data } = await this.client.get<T>(endpoint, { params })
      // fire-and-forget 로깅 (실패해도 메인 흐름 끊지 않음)
      this.logUsage(endpoint, 200, Date.now() - start)
      return data
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status ?? 500 : 500
      const msg = isAxiosError(err) ? err.message : String(err)
      this.logger.error(`API call failed: ${endpoint} (${status}) ${msg}`)
      this.logUsage(endpoint, status, Date.now() - start)
      throw err
    }
  }

  /** 매일 자정 cron에서 호출 (다음 단계에서 등록) */
  resetDailyCount(): void {
    this.logger.log(
      `Daily count reset (yesterday: ${this.dailyCallCount}/${this.DAILY_LIMIT})`,
    )
    this.dailyCallCount = 0
  }

  getStatus() {
    return {
      called: this.dailyCallCount,
      limit: this.DAILY_LIMIT,
      remaining: this.DAILY_LIMIT - this.dailyCallCount,
    }
  }

  private logUsage(endpoint: string, statusCode: number, durationMs: number): void {
    db.insert(apiUsage)
      .values({
        provider: 'jeongbonaru',
        endpoint,
        statusCode,
        cachedHit: false,
        durationMs,
      })
      .catch((e) => {
        this.logger.error(`api_usage insert failed: ${String(e)}`)
      })
  }
}
