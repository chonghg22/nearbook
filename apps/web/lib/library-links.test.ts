import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { libraryDirectionsUrl, parseLibraryLinks, safeLibraryHomepage } from './library-links.mjs'
import { parseHoldings } from './holdings-data.mjs'
import { HoldingsView } from '@/app/book/[isbn]/_components/holdings-view'
import { LibraryCard } from '@/components/library/library-card'
import type { LinkedHoldingsResult } from './library-links.mjs'

const now = Date.parse('2026-10-14T00:00:00Z')
function payload(
  status: 'available' | 'borrowed' | 'not_held' | 'unknown' = 'available',
  metadata = {}
) {
  const known = status !== 'unknown'
  return {
    libraries: [
      {
        id: 111314,
        name: '서울도서관',
        distanceKm: 0,
        status,
        hasBook: known ? status !== 'not_held' : null,
        loanAvailable: known ? status === 'available' : null,
        checkedAt: known ? new Date(now).toISOString() : null,
        lastAttemptAt: new Date(now).toISOString(),
        stale: false,
        source: 'jeongbonaru:bookExist',
        homepage: 'https://lib.seoul.go.kr/',
        lat: 37.5665,
        lng: 126.978,
        ...metadata,
      },
    ],
    holdings: {
      nearbyCount: 1,
      attemptedCount: 1,
      checkedCount: Number(known),
      heldCount: Number(known && status !== 'not_held'),
      availableCount: Number(status === 'available'),
      borrowedCount: Number(status === 'borrowed'),
      notHeldCount: Number(status === 'not_held'),
      unknownCount: Number(!known),
      uncheckedCount: 0,
      limited: false,
      source: 'jeongbonaru:bookExist',
    },
  }
}
const html = (result: LinkedHoldingsResult) =>
  renderToStaticMarkup(
    createElement(HoldingsView, {
      isbn: '9788936434120',
      result,
      loading: false,
      error: false,
      onRetry: () => {},
    })
  )

describe('safe official library URLs', () => {
  it.each(['https://lib.example/', 'http://lib.example/', ' HTTPS://lib.example/ '])(
    'accepts explicit HTTP(S) homepage %s',
    (url) => {
      expect(safeLibraryHomepage(url)).toMatch(/^https?:\/\/lib\.example\/$/)
    }
  )
  it.each([
    null,
    undefined,
    '',
    42,
    {},
    'javascript:alert(1)',
    'data:text/html,hi',
    '//evil.test',
    '/library/111314',
    'lib.example',
    'https://user:secret@lib.example/',
    'https://',
    'ftp://lib.example/',
  ])('hides unsafe/missing URL %s', (url) => {
    expect(safeLibraryHomepage(url)).toBeNull()
  })
  it('uses documented destination order and encodes special characters', () => {
    expect(libraryDirectionsUrl(37.5665, 126.978, ' 서울 / 도서관?,# ')).toBe(
      `https://map.kakao.com/link/to/${encodeURIComponent('서울 / 도서관?,#')},37.5665,126.978`
    )
  })
  it.each([
    [undefined, 127],
    [37, null],
    ['37', '127'],
    [NaN, 127],
    [37, Infinity],
    [91, 127],
    [37, 181],
  ])('hides invalid coordinates %s,%s', (lat, lng) => {
    expect(libraryDirectionsUrl(lat, lng, '도서관')).toBeNull()
    expect(parseLibraryLinks({ lat, lng })).toEqual({ homepage: null, lat: null, lng: null })
  })
  it('does not treat zero coordinates as missing and never adds an origin', () => {
    expect(libraryDirectionsUrl(0, 0, '도서관')).toBe(
      `https://map.kakao.com/link/to/${encodeURIComponent('도서관')},0,0`
    )
    expect(libraryDirectionsUrl(37, 127, ' ')).toBeNull()
  })
})

describe('book holding CTA wiring', () => {
  it('uses the verified HTTPS Seoul landing page for its legacy HTTP root only', () => {
    const result = parseHoldings(payload('available', { homepage: 'http://lib.seoul.go.kr/' }), now)
    expect(result.libraries[0]?.homepage).toBe('https://lib.seoul.go.kr/')
    expect(parseLibraryLinks({ homepage: 'http://another-library.example/' }).homepage).toBe(
      'http://another-library.example/'
    )
    expect(parseLibraryLinks({ homepage: 'http://lib.seoul.go.kr/other' }).homepage).toBe(
      'http://lib.seoul.go.kr/other'
    )
  })
  it('retains metadata through the second parse used by the freshness timer', () => {
    const first = parseHoldings(payload(), now)
    const second = parseHoldings(first, now + 300001)
    expect(second.libraries[0]).toMatchObject({
      homepage: 'https://lib.seoul.go.kr/',
      lat: 37.5665,
      lng: 126.978,
      stale: true,
    })
    const output = html(second)
    expect(output).toContain('href="https://lib.seoul.go.kr/"')
    expect(output).toContain(`href="${libraryDirectionsUrl(37.5665, 126.978, '서울도서관')}"`)
    expect(output).toContain('이전 조회 정보')
  })
  it.each(['available', 'borrowed', 'not_held', 'unknown'] as const)(
    'shows real links for %s without implying reservation',
    (status) => {
      const output = html(parseHoldings(payload(status), now))
      expect(output).toContain('공식 사이트에서 확인')
      expect(output).toContain('카카오맵, 새 탭')
      expect(output).toContain('이 서비스에서 예약이 접수되지는 않습니다')
      expect(output).not.toContain('예약하기')
      expect(output).not.toContain('reservation')
      expect(output).toContain('기준점에서 0m')
      expect(output.indexOf('소장 여부')).toBeLessThan(output.indexOf('공식 사이트에서 확인'))
      expect(output.indexOf('확인:')).toBeLessThan(output.indexOf('공식 사이트에서 확인'))
    }
  )
  it('does not reject known holdings when optional metadata is invalid', () => {
    const result = parseHoldings(
      payload('available', { homepage: 'javascript:alert(1)', lat: '37', lng: null }),
      now
    )
    expect(result.holdings.availableCount).toBe(1)
    const output = html(result)
    expect(output).toContain('대출 가능')
    expect(output).toContain('공식 사이트 정보 없음')
    expect(output).toContain('href="/library/111314"')
    expect(output).not.toContain('javascript:')
    expect(output).not.toContain('href="https://map.kakao.com')
  })
  it('keeps the old no-metadata contract usable', () => {
    const result = parseHoldings(
      payload('available', { homepage: undefined, lat: undefined, lng: undefined }),
      now
    )
    expect(result.libraries[0]).toMatchObject({
      status: 'available',
      homepage: null,
      lat: null,
      lng: null,
    })
  })
  it('keeps directions if homepage is absent, and homepage if coordinates are absent', () => {
    expect(html(parseHoldings(payload('available', { homepage: null }), now))).toContain(
      'https://map.kakao.com/link/to/'
    )
    const output = html(parseHoldings(payload('available', { lat: null, lng: null }), now))
    expect(output).toContain('href="https://lib.seoul.go.kr/"')
    expect(output).not.toContain('href="https://map.kakao.com')
  })
  it('guards direct card callers too, and does not render links while loading/error', () => {
    const output = renderToStaticMarkup(
      createElement(LibraryCard, {
        libraryId: '111314',
        libraryName: '도서관',
        status: 'unknown',
        homepageUrl: 'javascript:alert(1)',
        directionsUrl: 'javascript:alert(2)',
      })
    )
    expect(output).not.toContain('javascript:')
    for (const flags of [
      { loading: true, error: false },
      { loading: false, error: true },
    ]) {
      const state = renderToStaticMarkup(
        createElement(HoldingsView, {
          isbn: '9788936434120',
          result: parseHoldings(payload(), now),
          ...flags,
          onRetry: () => {},
        })
      )
      expect(state).not.toContain('https://lib.seoul.go.kr/')
    }
  })
  it('keeps library action ahead of advertising and affiliate options on book detail', () => {
    const page = readFileSync(new URL('../app/book/[isbn]/page.tsx', import.meta.url), 'utf8')
    expect(page.indexOf('<LibraryStatus')).toBeLessThan(page.indexOf('<AdSenseSlot'))
    expect(page.indexOf('<LibraryStatus')).toBeLessThan(page.indexOf('<AffiliateOptions'))
  })
})
