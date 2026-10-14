import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { HoldingsResult, NearbyHolding } from '@nearbook/shared-types'
import { HoldingsView } from './_components/holdings-view'

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
const row = (status: NearbyHolding['status'], id = 111314): NearbyHolding => ({ id, name: '서울도서관', status,
  hasBook: status === 'unknown' ? null : status !== 'not_held', loanAvailable: status === 'unknown' ? null : status === 'available',
  checkedAt: status === 'unknown' ? null : '2026-10-14T00:00:00Z', lastAttemptAt: '2026-10-14T00:00:00Z', stale: false, source: 'jeongbonaru:bookExist' })
function result(rows: NearbyHolding[], nearbyCount = rows.length): HoldingsResult {
  return { libraries: rows, holdings: { nearbyCount, attemptedCount: rows.length, checkedCount: rows.filter((r) => r.status !== 'unknown').length,
    heldCount: rows.filter((r) => r.hasBook === true).length, availableCount: rows.filter((r) => r.status === 'available').length,
    borrowedCount: rows.filter((r) => r.status === 'borrowed').length, notHeldCount: rows.filter((r) => r.status === 'not_held').length,
    unknownCount: rows.filter((r) => r.status === 'unknown').length, uncheckedCount: nearbyCount - rows.length,
    limited: nearbyCount > rows.length, source: 'jeongbonaru:bookExist' } }
}
const html = (data: HoldingsResult | null, extra = {}) => renderToStaticMarkup(createElement(HoldingsView, {
  isbn: '9788936434120', result: data, loading: false, error: false, onRetry: () => {}, ...extra }))
describe('holding UI semantics', () => {
  it('does not show zero or absence during loading', () => {
    const output = html(null, { loading: true })
    expect(output).toContain('확인하고 있습니다')
    expect(output).not.toContain('미소장')
  })
  it('shows retry rather than empty during endpoint failure', () => {
    const output = html(null, { error: true })
    expect(output).toContain('role="alert"')
    expect(output).toContain('책이 없다는 뜻은 아닙니다')
    expect(output).toContain('다시 시도')
  })
  it('distinguishes missing nearby libraries from missing holdings', () => {
    expect(html(result([]))).toContain('도서관을 찾지 못했습니다')
    expect(html(result([row('not_held')]))).toContain('소장하지 않는 것으로')
  })
  it('renders all four statuses without fabricated copy counts', () => {
    const output = html(result([row('available'), row('borrowed', 111315), row('not_held', 111316), row('unknown', 111317)]))
    for (const text of ['대출 가능', '대출 불가', '미소장', '확인 불가', '상태 확인 3곳', '소장 확인 2곳', '대출 가능 1곳']) expect(output).toContain(text)
    expect(output).not.toContain('1권 대출 가능')
    expect(output).not.toContain('0권 대출 가능')
    expect(output).toContain('/library/111314')
    expect(output).toContain('확인 시각은 이 서비스가 조회한 시각')
  })
  it('retains known rows during partial failure and offers retry', () => {
    const output = html(result([row('available'), row('unknown', 111315)], 30))
    expect(output).toContain('서울도서관')
    expect(output).toContain('28곳은 확인하지 않았습니다')
    expect(output).toContain('보유 현황 다시 확인')
  })
  it('labels old observation and offers refresh', () => {
    const output = html(result([{ ...row('available'), stale: true }]))
    expect(output).toContain('이전 조회 정보')
    expect(output).toContain('대출 가능 상태가 달라졌을 수 있습니다')
    expect(output).toContain('보유 현황 다시 확인')
  })
})
