import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { db, sql } from '@nearbook/db'
import { NotifyService } from '../../notify/services/notify.service'
import { QuotaBlockedError, QuotaBlockReason } from '../utils/quota.errors'

export type Priority = 'HIGH' | 'LOW'
export type QuotaMode = 'normal' | 'warn' | 'critical' | 'blocked'

interface CacheEntry {
  count: number
  expiresAtMs: number
}

interface NotifyState {
  lastWarnDayKey: string | null      // 'YYYY-MM-DD' (Asia/Seoul)
  lastCriticalDayKey: string | null
  lastBlockedDayKey: string | null
  lastBlockedNotifyMs: number        // 100% 지속 시 30분 쿨다운
  hasWarnedToday: boolean            // 회복 알림 트리거 여부
  lastAbuseNotifyMs: number
}

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name)
  private readonly cache = new Map<string, CacheEntry>()  // provider → entry
  private readonly notifyState: NotifyState = {
    lastWarnDayKey: null,
    lastCriticalDayKey: null,
    lastBlockedDayKey: null,
    lastBlockedNotifyMs: 0,
    hasWarnedToday: false,
    lastAbuseNotifyMs: 0,
  }

  constructor(
    private readonly config: ConfigService,
    private readonly notify: NotifyService,
  ) {}

  private get limit(): number {
    return Number(this.config.get<number>('JEONGBONARU_DAILY_LIMIT') ?? 30_000)
  }

  private get warnRatio(): number {
    return Number(this.config.get('QUOTA_THRESHOLD_WARN') ?? 0.80)
  }

  private get criticalRatio(): number {
    return Number(this.config.get('QUOTA_THRESHOLD_CRITICAL') ?? 0.95)
  }

  private get blockedRatio(): number {
    return Number(this.config.get('QUOTA_THRESHOLD_BLOCKED') ?? 1.00)
  }

  private get cacheTtlMs(): number {
    return Number(this.config.get('QUOTA_CACHE_TTL_MS') ?? 30_000)
  }

  private get timezone(): string {
    return this.config.get<string>('QUOTA_RESET_TIMEZONE') ?? 'Asia/Seoul'
  }

  private get abuseWindowMs(): number {
    return Number(this.config.get('ABUSE_DETECTION_WINDOW_MS') ?? 600_000)
  }

  private get abuseThreshold(): number {
    return Number(this.config.get('ABUSE_DETECTION_THRESHOLD') ?? 100)
  }

  // 한국 자정 기준 'YYYY-MM-DD' 문자열
  private currentDayKey(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
    return formatter.format(new Date())
  }

  // 오늘 호출 수 (status=200 만, 30s 캐시)
  async getDailyCount(provider = 'jeongbonaru', force = false): Promise<number> {
    const cached = this.cache.get(provider)
    if (!force && cached && cached.expiresAtMs > Date.now()) {
      return cached.count
    }

    // Asia/Seoul 자정 ~ 현재까지의 호출 수
    const result = await db.execute(sql`
      SELECT count(*)::int AS count
      FROM nearbook.api_usage
      WHERE provider = ${provider}
        AND status_code = 200
        AND created_at >= date_trunc('day', now() AT TIME ZONE ${this.timezone}) AT TIME ZONE ${this.timezone}
    `)

    const count = Number((result as any)[0]?.count ?? 0)
    this.cache.set(provider, {
      count,
      expiresAtMs: Date.now() + this.cacheTtlMs,
    })
    return count
  }

  // 즉시 카운트 갱신 (호출 직후 in-memory 증가, DB 정확값은 30s 후 동기화)
  bumpCachedCount(provider = 'jeongbonaru', delta = 1): void {
    const cached = this.cache.get(provider)
    if (cached) {
      cached.count += delta
    }
  }

  modeForCount(count: number): QuotaMode {
    const ratio = count / this.limit
    if (ratio >= this.blockedRatio) return 'blocked'
    if (ratio >= this.criticalRatio) return 'critical'
    if (ratio >= this.warnRatio) return 'warn'
    return 'normal'
  }

  // 호출 전 게이트
  async acquire(
    provider: 'jeongbonaru',
    priority: Priority,
  ): Promise<{ ok: true } | { ok: false; reason: QuotaBlockReason }> {
    const count = await this.getDailyCount(provider)
    const mode = this.modeForCount(count)

    if (mode === 'blocked') {
      return { ok: false, reason: 'QUOTA_BLOCKED_ALL' }
    }
    if (mode === 'critical' && priority === 'LOW') {
      return { ok: false, reason: 'QUOTA_BLOCKED_LOW' }
    }
    return { ok: true }
  }

  // 호출 후 + cron 둘 다 사용. 임계값 hit / 회복 / 어뷰즈 알림.
  async checkAndNotifyThresholds(provider = 'jeongbonaru', force = false): Promise<void> {
    const count = await this.getDailyCount(provider, force)
    const mode = this.modeForCount(count)
    const dayKey = this.currentDayKey()
    const percentage = ((count / this.limit) * 100).toFixed(1)

    const baseFields = [
      { name: '호출 수', value: `${count} / ${this.limit}`, inline: true },
      { name: '백분율', value: `${percentage}%`, inline: true },
      { name: '모드', value: mode, inline: true },
    ]

    // 100% 도달
    if (mode === 'blocked') {
      const sinceLast = Date.now() - this.notifyState.lastBlockedNotifyMs
      const needNotify = this.notifyState.lastBlockedDayKey !== dayKey || sinceLast >= 30 * 60 * 1000

      if (needNotify) {
        await this.notify.sendDiscord({
          level: 'critical',
          title: '정보나루 한도 100% 도달 — 모든 호출 차단',
          description: 'HIGH/LOW 모두 차단 중. 사용자 응답엔 캐시만 사용됨.',
          fields: baseFields,
        })
        this.notifyState.lastBlockedDayKey = dayKey
        this.notifyState.lastBlockedNotifyMs = Date.now()
        this.notifyState.hasWarnedToday = true
      }
      return
    }

    // 95% 도달 (LOW 차단 시작)
    if (mode === 'critical' && this.notifyState.lastCriticalDayKey !== dayKey) {
      await this.notify.sendDiscord({
        level: 'critical',
        title: '정보나루 한도 95% 도달 — LOW priority 차단',
        description: '백그라운드 호출 차단. HIGH(사용자 트리거)는 통과.',
        fields: baseFields,
      })
      this.notifyState.lastCriticalDayKey = dayKey
      this.notifyState.hasWarnedToday = true
      return
    }

    // 80% 도달
    if ((mode === 'warn' || mode === 'critical')
        && this.notifyState.lastWarnDayKey !== dayKey) {
      await this.notify.sendDiscord({
        level: 'warn',
        title: '정보나루 한도 80% 도달',
        description: '95% 도달 시 LOW 호출이 차단됩니다.',
        fields: baseFields,
      })
      this.notifyState.lastWarnDayKey = dayKey
      this.notifyState.hasWarnedToday = true
    }

    // 회복 알림: 50% 이하 + 오늘 한 번이라도 80%+ 였음
    if (count / this.limit <= 0.50 && this.notifyState.hasWarnedToday) {
      await this.notify.sendDiscord({
        level: 'recovery',
        title: '정보나루 한도 회복 — 50% 이하',
        fields: baseFields,
      })
      this.notifyState.hasWarnedToday = false
    }
  }

  // 어뷰즈 감지 — 10분 윈도우
  async checkAbuse(provider = 'jeongbonaru'): Promise<void> {
    const result = await db.execute(sql`
      SELECT count(*)::int AS count
      FROM nearbook.api_usage
      WHERE provider = ${provider}
        AND status_code = 200
        AND created_at >= now() - (${this.abuseWindowMs} || ' milliseconds')::interval
    `)
    const recent = Number((result as any)[0]?.count ?? 0)

    if (recent >= this.abuseThreshold) {
      const sinceLast = Date.now() - this.notifyState.lastAbuseNotifyMs
      if (sinceLast >= 60 * 60 * 1000) {  // 1시간 쿨다운
        await this.notify.sendDiscord({
          level: 'abuse',
          title: '어뷰즈/버그 의심',
          description: `최근 ${this.abuseWindowMs / 60000}분간 ${recent}회 호출 (임계값 ${this.abuseThreshold})`,
          fields: [
            { name: '윈도우 호출 수', value: String(recent), inline: true },
            { name: '임계값', value: String(this.abuseThreshold), inline: true },
          ],
        })
        this.notifyState.lastAbuseNotifyMs = Date.now()
      }
    }
  }

  // 일별 자동 리셋
  resetDayMarkers(): void {
    this.notifyState.hasWarnedToday = false
    this.cache.clear()  // DB 재조회 강제
    this.logger.log('Quota day markers reset')
  }

  // /health 용
  async getStatus(provider = 'jeongbonaru') {
    const count = await this.getDailyCount(provider)
    const mode = this.modeForCount(count)

    // 다음 한국 자정 ISO
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
    const todayKstStr = formatter.format(now)
    const nextMidnightKst = new Date(`${todayKstStr}T00:00:00+09:00`)
    nextMidnightKst.setDate(nextMidnightKst.getDate() + 1)

    return {
      provider,
      called: count,
      limit: this.limit,
      remaining: Math.max(0, this.limit - count),
      percentage: Number(((count / this.limit) * 100).toFixed(1)),
      mode,
      resetAt: nextMidnightKst.toISOString(),
    }
  }
}
