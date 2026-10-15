import { expect, it } from 'vitest'
import {
  parseWishlists,
  parseSavedLibraries,
  parseAdded,
  personalErrorMessage,
  PersonalApiError,
} from './personal-data'

const book = {
  isbn: '9788936434120',
  title: '소년이 온다',
  author: '한강',
  coverUrl: null,
  addedAt: '2026-10-15T00:00:00Z',
  note: null,
}
const card = {
  id: 1,
  libraryId: 111314,
  nickname: null,
  isDefault: true,
  library: {
    name: '서울도서관',
    address: '서울 중구',
    lat: 37.56,
    lng: 126.97,
    homepage: 'http://lib.seoul.go.kr/',
  },
}
it('accepts real authenticated lists without inventing empty data, counts or plan', () => {
  expect(parseWishlists({ data: [book], meta: { total: 1, plan: 'free' } }).items).toEqual([book])
  expect(
    parseSavedLibraries({ data: [card], meta: { total: 1, plan: 'pro' } }).items[0]?.library
      .homepage
  ).toBe('https://lib.seoul.go.kr/')
  expect(parseWishlists({ data: [] })).toEqual({ items: [], total: 0, plan: 'free' })
})
it.each([
  {},
  { data: null },
  { data: [book] },
  { data: [book], meta: { total: 0, plan: 'free' } },
  { data: [book, book], meta: { total: 2, plan: 'free' } },
  { data: [{ ...book, addedAt: 'invalid' }], meta: { total: 1, plan: 'free' } },
])('rejects malformed private lists %#', (value) => {
  expect(() => parseWishlists(value)).toThrow(PersonalApiError)
})
it('allows a legacy multiple-default list to be repaired but rejects duplicate IDs and unsafe links', () => {
  const value = parseSavedLibraries({
    data: [
      card,
      {
        ...card,
        id: 2,
        libraryId: 111315,
        library: { ...card.library, homepage: 'javascript:alert(1)' },
      },
    ],
    meta: { total: 2, plan: 'pro' },
  })
  expect(value.items.filter((row) => row.isDefault)).toHaveLength(2)
  expect(value.items[1]?.library.homepage).toBeNull()
  expect(() =>
    parseSavedLibraries({ data: [card, card], meta: { total: 2, plan: 'pro' } })
  ).toThrow()
})
it.each([null, {}, { data: {} }, { data: { added: 'false' } }, { data: { added: 1 } }])(
  'never coerces malformed status to a registered state %#',
  (value) => {
    expect(() => parseAdded(value)).toThrow()
  }
)
it('uses sanitized status-specific recovery messages without upselling or changing policies', () => {
  expect(personalErrorMessage(new PersonalApiError(401))).toContain('다시 로그인')
  expect(personalErrorMessage(new PersonalApiError(403))).toContain('등록 한도')
  expect(personalErrorMessage(new PersonalApiError(409))).toContain('기본 도서관')
  expect(personalErrorMessage(new Error('sensitive upstream body'))).not.toContain('sensitive')
})
