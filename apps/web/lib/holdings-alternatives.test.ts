import { expect, it } from 'vitest'
import { alternativeEditionSearch, HOLDING_RADII, nextHoldingRadius } from './holdings-alternatives'

it('only offers bounded explicit 5 → 10 → 20km expansion', () => {
  expect(HOLDING_RADII).toEqual([5, 10, 20])
  expect(nextHoldingRadius(5)).toBe(10)
  expect(nextHoldingRadius(10)).toBe(20)
  expect(nextHoldingRadius(20)).toBeNull()
})
it.each([undefined, '', '   '])('missing title %s does not fabricate an edition link', (title) => {
  expect(alternativeEditionSearch(title)).toBeNull()
})
it('searches the title before a subtitle as an encoded explicit title query, not an ISBN', () => {
  const url = new URL(
    alternativeEditionSearch('  소년이 온다 : 한강 장편소설  ')!,
    'https://example.test'
  )
  expect(url.pathname).toBe('/search')
  expect(url.searchParams.get('q')).toBe('소년이 온다')
  expect(url.searchParams.get('searchType')).toBe('title')
  expect(url.searchParams.has('isbn')).toBe(false)
})
it('encodes punctuation without injecting URL parameters and respects API query limits', () => {
  const url = new URL(
    alternativeEditionSearch('책 & searchType=isbn # <글>')!,
    'https://example.test'
  )
  expect(url.searchParams.get('q')).toBe('책 & searchType=isbn # <글>')
  expect(url.searchParams.get('searchType')).toBe('title')
  expect(url.hash).toBe('')
  expect(
    new URL(alternativeEditionSearch('책'.repeat(201))!, url.origin).searchParams.get('q')?.length
  ).toBe(200)
})
