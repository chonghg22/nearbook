import { expect, it } from 'vitest'
import { safeReturnPath } from './auth-return-path'
it('preserves safe internal return routes without changing the main fallback', () => {
  expect(safeReturnPath('/book/9788936434120')).toBe('/book/9788936434120')
  expect(safeReturnPath('/me/libraries')).toBe('/me/libraries')
  expect(safeReturnPath('/search?q=%ED%95%9C%EA%B0%95')).toBe('/search?q=%ED%95%9C%EA%B0%95')
  expect(safeReturnPath(undefined)).toBe('/')
})
it.each([
  'https://evil.example/',
  '//evil.example/',
  '/\\evil.example/',
  '@evil.example/',
  '/me\n/wishlist',
  '/'.repeat(2049),
])('rejects unsafe return route %#', (value) => {
  expect(safeReturnPath(value)).toBe('/')
})
