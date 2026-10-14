import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseLibraryDetail, parseLibrarySearch, parseOperatingHours, parseSearchResult, parseSuggestions } from './api-contracts'
import { LibraryHours } from '@/components/library/library-hours'
import { ResultList } from '@/app/search/_components/result-list'

const book = { isbn: '9788936434120', title: '소년이 온다', author: '한강', publisher: null, coverUrl: null }
const result = { data: { items: [book], total: 1, page: 1, pageSize: 10 } }
const library = { id: 111314, name: '서울도서관', address: '서울 중구', region: '서울특별시 중구', lat: 37.56, lng: 126.98,
  phone: null, homepage: 'https://lib.example/', operatingHours: { text: '평일 09:00~18:00', closed: '매주 월요일' } }

describe('runtime API schemas', () => {
  it('keeps legitimate empty search separate from failure', () => {
    expect(parseSearchResult({ data: { items: [], total: 0, page: 1, pageSize: 10 } }).data.items).toEqual([])
    expect(() => parseSearchResult({ error: 'failed' })).toThrow()
  })
  it('selects validated search fields and supports nullable optional metadata', () => {
    expect(parseSearchResult(result)).toEqual(result)
    expect(parseSuggestions({ data: [{ isbn: book.isbn, title: book.title }] })).toEqual({ data: [{ ...book, author: null }] })
  })
  it('preserves optional enrichment state while rejecting truthy non-boolean flags', () => {
    const pending = { data: { ...result.data, enrichmentPending: true, enrichmentFailed: false } }
    expect(parseSearchResult(pending)).toEqual(pending)
    for (const key of ['enrichmentPending', 'enrichmentFailed']) {
      expect(() => parseSearchResult({ data: { ...result.data, [key]: 'true' } })).toThrow()
    }
  })
  for (const invalid of [null, {}, { data: {} }, { data: { ...result.data, total: '1' } },
    { data: { ...result.data, page: 0 } }, { data: { ...result.data, items: [{ ...book, isbn: '../login' }] } },
    { data: { ...result.data, items: [{ ...book, title: '' }] } }, { data: { ...result.data, total: 0 } }]) {
    it('rejects malformed/non-OK-shaped search data rather than treating it as zero', () => expect(() => parseSearchResult(invalid)).toThrow())
  }
  it('does not render unsafe cover URLs', () => {
    expect(parseSuggestions({ data: [{ ...book, coverUrl: 'javascript:alert(1)' }] }).data[0]?.coverUrl).toBeNull()
  })
  it('validates library identity, coordinates and runtime operating hours', () => {
    expect(parseLibraryDetail({ data: library })).toEqual(library)
    expect(parseLibrarySearch({ data: [library] }).data[0]).toMatchObject({ id: library.id, name: library.name, lat: library.lat })
  })
  for (const invalid of [{ ...library, lat: null }, { ...library, lng: 200 }, { ...library, name: '' },
    { ...library, operatingHours: { text: 9 } }, { ...library, operatingHours: { closed: false } }]) {
    it('rejects wrong library schemas before rendering', () => expect(() => parseLibraryDetail({ data: invalid })).toThrow())
  }
  it('normalizes legacy string/weekday hours, retaining closed-day text', () => {
    expect(parseOperatingHours('09:00~18:00')).toEqual({ text: '09:00~18:00', closed: null })
    expect(parseOperatingHours({ weekday: '평일 9~18', closed: '월요일' })).toEqual({ text: '평일 9~18', closed: '월요일' })
    expect(parseOperatingHours(null)).toBeNull()
  })
  it('renders actual text and closed fields, without fake weekday hours', () => {
    const html = renderToStaticMarkup(createElement(LibraryHours, { hours: library.operatingHours }))
    expect(html).toContain('운영시간'); expect(html).toContain('09:00~18:00'); expect(html).toContain('휴관일'); expect(html).toContain('매주 월요일')
    expect(renderToStaticMarkup(createElement(LibraryHours, { hours: null }))).toBe('')
  })
  it('search failure is an alert, not a normal no-results message', () => {
    const html = renderToStaticMarkup(createElement(ResultList, { isLoading: false, query: 'test', items: [], error: new Error('failure') }))
    expect(html).toContain('role="alert"'); expect(html).toContain('검색 결과가 없다는 뜻은 아닙니다')
    expect(html).not.toContain('검색 결과가 없어요')
  })
})
