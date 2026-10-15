import { ConfigService } from '@nestjs/config'

// Account owner confirmed 500/day on 2026-10-15. Raising this requires a new account-limit decision.
export const VERIFIED_ACCOUNT_LIMIT = 500
export type Priority = 'HIGH' | 'LOW'
export type QuotaMode = 'normal' | 'warn' | 'critical' | 'blocked'

export function positiveInteger(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error('Invalid provider numeric configuration')
  return parsed
}

export function quotaPolicy(config: ConfigService) {
  const configuredLimit = positiveInteger(
    config.get('JEONGBONARU_DAILY_LIMIT'),
    VERIFIED_ACCOUNT_LIMIT
  )
  const limit = Math.min(configuredLimit, VERIFIED_ACCOUNT_LIMIT)
  return {
    limit,
    accountLimit: VERIFIED_ACCOUNT_LIMIT,
    accountLimitVerifiedOn: '2026-10-15',
    configuredLimit,
    limitClamped: configuredLimit > limit,
    lowPriorityLimit: Math.ceil(limit * 0.95),
    warnAt: Math.ceil(limit * 0.8),
    timezone: 'Asia/Seoul' as const,
    accounting: 'reserved-attempts' as const,
  }
}

export function quotaMode(called: number, limit: number): QuotaMode {
  if (called >= limit) return 'blocked'
  if (called >= Math.ceil(limit * 0.95)) return 'critical'
  if (called >= Math.ceil(limit * 0.8)) return 'warn'
  return 'normal'
}
