import { holdingFailure, holdingSummary, observeHolding } from './holding-observation'

const now = new Date('2026-10-14T00:00:00Z')
const response = (hasBook: unknown, loanAvailable?: unknown) => ({ response: { result: { hasBook, loanAvailable } } })

describe('bookExist observations, never copy counts', () => {
  it.each([
    ['Y', 'Y', 'available', true, true], ['Y', 'N', 'borrowed', true, false],
    ['N', 'N', 'not_held', false, false], ['N', undefined, 'not_held', false, false],
    ['Y', undefined, 'unknown', true, null],
  ])('maps %s/%s to %s', (has, loan, status, hasBook, loanAvailable) => {
    expect(observeHolding(response(has, loan), now)).toMatchObject({ status, hasBook, loanAvailable,
      checkedAt: now.toISOString(), source: 'jeongbonaru:bookExist', stale: false })
    expect(observeHolding(response(has, loan), now)).not.toHaveProperty('holdingCount')
  })
  it.each([null, {}, { response: {} }, response(undefined, 'Y'), response('N', 'Y'), response('Y', 1), response('yes', 'no')])
    ('does not infer absence from invalid/contradictory payload %#', (payload) => {
      expect(observeHolding(payload, now)).toMatchObject({ status: 'unknown', hasBook: null, loanAvailable: null, checkedAt: null })
    })
  it.each([
    [{ message: 'API_LIMIT_EXCEEDED' }, 'quota'], [{ response: { status: 429 } }, 'quota'],
    [{ code: 'ECONNABORTED' }, 'timeout'], [{ response: { status: 503 }, message: 'secret body' }, 'upstream'],
    [{ message: 'INVALID_OWNERSHIP_RESULT' }, 'invalid-response'],
  ])('sanitizes failures %#', (error, reason) => {
    expect(holdingFailure(error)).toMatchObject({ status: 'unknown', reason, hasBook: null, checkedAt: null })
    expect(JSON.stringify(holdingFailure(error))).not.toContain('secret body')
  })
  it('summarizes confirmed/unknown/unchecked libraries separately', () => {
    const rows = ['Y', 'N'].map((loan, i) => ({ id: i + 1, name: '도서관', ...observeHolding(response('Y', loan), now) }))
    rows.push({ id: 3, name: '도서관', ...holdingFailure(new Error('timeout')) })
    expect(holdingSummary(rows, 30)).toMatchObject({ nearbyCount: 30, attemptedCount: 3, checkedCount: 2,
      heldCount: 2, availableCount: 1, borrowedCount: 1, unknownCount: 1, notHeldCount: 0, uncheckedCount: 27, limited: true })
  })
})
