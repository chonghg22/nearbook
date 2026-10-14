import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LOCATION,
  regionLocation,
  libraryLocation,
  restoreLocation,
  locationDescription,
} from './location-state'
import { nearbyLibrariesPath, parseHomeLibraries, formatReferenceDistance } from './home-libraries'

describe('reference location, not a guessed current position', () => {
  it('first visit uses an explicit Seoul region without GPS', () => {
    expect(restoreLocation(null)).toEqual(DEFAULT_LOCATION)
    expect(locationDescription(DEFAULT_LOCATION)).toMatchObject({
      title: '기준 지역',
      label: '서울특별시',
    })
    expect(locationDescription(DEFAULT_LOCATION).detail).toContain('내 현재 위치가 아닙니다')
  })
  for (const saved of [
    'broken',
    'null',
    '[]',
    '{}',
    '{"mode":"region","regionSlug":"unknown"}',
    '{"mode":"region","regionSlug":"__proto__"}',
    '{"mode":"gps","lat":null,"lng":127}',
    '{"mode":"gps","lat":95,"lng":127}',
    '{"mode":"library","libraryId":-1}',
  ]) {
    it('falls back safely for invalid storage', () =>
      expect(restoreLocation(saved)).toEqual(DEFAULT_LOCATION))
  }
  it('rebuilds saved region coordinates and labels from known data', () => {
    expect(
      restoreLocation(
        JSON.stringify({
          mode: 'region',
          regionSlug: 'seoul-gangnam',
          lat: 0,
          lng: 0,
          label: '현재 위치',
        })
      )
    ).toEqual(regionLocation('seoul-gangnam'))
    expect(regionLocation('seoul-gangnam')?.label).toBe('서울특별시 강남구')
  })
  it('restores GPS as saved, never current', () => {
    const gps = restoreLocation(
      JSON.stringify({ mode: 'gps', lat: 37.5, lng: 127, label: '현재 위치' })
    )
    expect(gps).toMatchObject({ mode: 'gps', isSaved: true, label: '저장된 GPS 위치' })
    expect(locationDescription(gps).title).toBe('저장된 GPS 기준')
  })
  it('library reference preserves validated coordinates and a canonical name', () => {
    const library = libraryLocation({ id: 111314, name: ' 서울도서관 ', lat: 37.56, lng: 126.97 })!
    expect(library.label).toBe('서울도서관')
    expect(restoreLocation(JSON.stringify(library))).toEqual(library)
    expect(locationDescription(library).title).toBe('기준 도서관')
    expect(libraryLocation({ id: 0, name: '', lat: 0, lng: 0 })).toBeNull()
  })
})

const library = { id: 111314, name: '서울도서관', address: '서울', lat: 37.56, lng: 126.97 }
describe('home library data follows the selected reference', () => {
  it('supports the actual bare-array near endpoint as well as a library envelope', () => {
    const row = { ...library, distanceKm: 0.03, distance_m: 29.3165672 }
    expect(parseHomeLibraries([row])).toEqual(parseHomeLibraries({ data: [row] }))
    expect(() => parseHomeLibraries({ statusCode: 503 })).toThrow()
  })
  it('different manual references yield different near queries, with a real 5km radius', () => {
    const seoul = nearbyLibrariesPath(DEFAULT_LOCATION)
    const busan = nearbyLibrariesPath(regionLocation('busan')!)
    expect(seoul).not.toBe(busan)
    expect(busan).toContain('radius=5')
    expect(busan).toContain('lat=35.1796')
  })
  it('keeps zero distance and labels it relative to the reference point', () => {
    expect(parseHomeLibraries({ data: [{ ...library, distanceKm: 0 }] })[0]?.distanceKm).toBe(0)
    expect(formatReferenceDistance(0)).toBe('기준점에서 0.0km')
  })
  it('does not invent a 0.5km distance when missing', () => {
    expect(parseHomeLibraries({ data: [library] })[0]?.distanceKm).toBeNull()
    expect(formatReferenceDistance(null)).toBeNull()
  })
  for (const distanceKm of [-1, '1', NaN, Infinity]) {
    it('rejects malformed distance', () =>
      expect(() => parseHomeLibraries({ data: [{ ...library, distanceKm }] })).toThrow())
  }
  it('normal empty is preserved; broken JSON is not a normal empty list', () => {
    expect(parseHomeLibraries({ data: [] })).toEqual([])
    expect(() => parseHomeLibraries({ data: {} })).toThrow()
  })
  it('shows at most twelve real nearest rows, not a popular-library fallback', () => {
    expect(
      parseHomeLibraries({
        data: Array.from({ length: 20 }, (_, i) => ({ ...library, id: i + 1, distanceKm: i })),
      })
    ).toHaveLength(12)
  })
})
