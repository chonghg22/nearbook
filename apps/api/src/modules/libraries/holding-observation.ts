import type { HoldingObservation, HoldingsSummary, NearbyHolding } from '@nearbook/shared-types'

export const HOLDING_TTL_MS = 5 * 60 * 1000

export function unknownHolding(reason: HoldingObservation['reason'], now = new Date()): HoldingObservation {
  return { status: 'unknown', hasBook: null, loanAvailable: null, checkedAt: null,
    lastAttemptAt: now.toISOString(), source: 'jeongbonaru:bookExist', stale: false, reason }
}

export function observeHolding(payload: unknown, now = new Date()): HoldingObservation {
  const result = (payload as { response?: { result?: { hasBook?: unknown; loanAvailable?: unknown } } } | null)?.response?.result
  if (!result || (result.hasBook !== 'Y' && result.hasBook !== 'N') ||
      (result.loanAvailable !== undefined && result.loanAvailable !== 'Y' && result.loanAvailable !== 'N') ||
      (result.hasBook === 'N' && result.loanAvailable === 'Y')) {
    return unknownHolding('invalid-response', now)
  }
  const hasBook = result.hasBook === 'Y'
  const loanAvailable = hasBook ? (result.loanAvailable === undefined ? null : result.loanAvailable === 'Y') : false
  const status = !hasBook ? 'not_held' : loanAvailable === null ? 'unknown' : loanAvailable ? 'available' : 'borrowed'
  return { status, hasBook, loanAvailable, checkedAt: now.toISOString(), lastAttemptAt: now.toISOString(),
    source: 'jeongbonaru:bookExist', stale: false, ...(status === 'unknown' ? { reason: 'invalid-response' as const } : {}) }
}

export function holdingFailure(error: unknown): HoldingObservation {
  const e = error as { code?: string; message?: string; response?: { status?: number } } | null
  const reason = e?.message === 'INVALID_OWNERSHIP_RESULT' ? 'invalid-response'
    : e?.message === 'API_LIMIT_EXCEEDED' || e?.response?.status === 429 ? 'quota'
    : e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT' ? 'timeout' : 'upstream'
  return unknownHolding(reason)
}

export function holdingSummary(libraries: NearbyHolding[], nearbyCount: number): HoldingsSummary {
  const count = (status: HoldingObservation['status']) => libraries.filter((lib) => lib.status === status).length
  const unknownCount = count('unknown')
  return { nearbyCount, attemptedCount: libraries.length, checkedCount: libraries.length - unknownCount,
    heldCount: libraries.filter((lib) => lib.hasBook === true).length,
    availableCount: count('available'), borrowedCount: count('borrowed'), notHeldCount: count('not_held'), unknownCount,
    uncheckedCount: Math.max(0, nearbyCount - libraries.length), limited: nearbyCount > libraries.length,
    source: 'jeongbonaru:bookExist' }
}
