import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import axios, { AxiosInstance } from 'axios'
import { apiUsage, db } from '@nearbook/db'

@Injectable()
export class JeongbonaruClient implements OnModuleInit {
  private readonly logger = new Logger(JeongbonaruClient.name)
  private readonly http: AxiosInstance
  private dailyCallCount = 0
  private readonly dailyLimit: number

  constructor(private readonly config: ConfigService) {
    const configuredLimit = this.config.get<string>('JEONGBONARU_DAILY_LIMIT')
    this.dailyLimit = configuredLimit ? Number(configuredLimit) : 500

    this.http = axios.create({
      baseURL: 'https://www.data4library.kr/api',
      timeout: 5_000,
      params: {
        authKey: this.config.get<string>('JEONGBONARU_API_KEY'),
        format: 'json',
      },
    })
  }

  onModuleInit() {
    if (!this.config.get<string>('JEONGBONARU_API_KEY')) {
      this.logger.warn('JEONGBONARU_API_KEY가 설정되지 않았습니다.')
    }
    this.logger.log(`JeongbonaruClient 초기화 (일 한도: ${this.dailyLimit})`)
  }

  async get<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    if (this.dailyCallCount >= this.dailyLimit) {
      this.logger.warn(`일 한도 초과: ${this.dailyCallCount}/${this.dailyLimit}`)
      throw new Error('API_LIMIT_EXCEEDED')
    }

    const start = Date.now()
    let statusCode = 200

    try {
      this.dailyCallCount++
      if (this.dailyCallCount >= this.dailyLimit * 0.9) {
        this.logger.warn(`API 호출 90% 도달: ${this.dailyCallCount}/${this.dailyLimit}`)
      }

      const { data } = await this.http.get<T>(endpoint, { params })
      return data
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number }; message?: string }
      statusCode = axiosError.response?.status ?? 500
      this.logger.error(`API 호출 실패: ${endpoint} - ${axiosError.message ?? 'unknown error'}`)
      throw error
    } finally {
      db.insert(apiUsage)
        .values({
          provider: 'jeongbonaru',
          endpoint,
          statusCode,
          cachedHit: false,
          durationMs: Date.now() - start,
        })
        .catch((insertError: unknown) => this.logger.error('api_usage insert 실패', insertError))
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  resetDailyCount() {
    this.logger.log(`일일 호출량 리셋: ${this.dailyCallCount} -> 0`)
    this.dailyCallCount = 0
  }

  getStatus() {
    const utilizationPct =
      this.dailyLimit > 0 ? Math.round((this.dailyCallCount / this.dailyLimit) * 100) : 0

    return {
      called: this.dailyCallCount,
      limit: this.dailyLimit,
      remaining: this.dailyLimit - this.dailyCallCount,
      utilizationPct,
    }
  }
}
