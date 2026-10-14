import { REGION_COORDS, REGION_TREE } from './region-coords'

export interface GpsLocation {
  mode: 'gps'
  lat: number
  lng: number
  label: string
  isSaved?: boolean
}
export interface RegionLocation {
  mode: 'region'
  regionSlug: string
  lat: number
  lng: number
  label: string
}
export interface LibraryLocation {
  mode: 'library'
  libraryId: number
  libraryName: string
  lat: number
  lng: number
  label: string
}
export type LocationMode = 'gps' | 'region' | 'library'
export type LocationContext = GpsLocation | RegionLocation | LibraryLocation
export const LOCATION_STORAGE_KEY = 'nearbook_location_ctx'

export function validCoordinates(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
  )
}
export function regionLocation(slug: string): RegionLocation | null {
  if (!Object.hasOwn(REGION_COORDS, slug)) return null
  const coord = REGION_COORDS[slug]!
  const province = REGION_TREE.find((sido) => sido.children.includes(slug))
  if (!province) return null
  const label = coord.label.endsWith(' 전체') ? province.label : `${province.label} ${coord.label}`
  return { mode: 'region', regionSlug: slug, lat: coord.lat, lng: coord.lng, label }
}
export const DEFAULT_LOCATION: RegionLocation = regionLocation('seoul')!
export function libraryLocation(lib: {
  id: number
  name: string
  lat: number
  lng: number
}): LibraryLocation | null {
  if (
    !Number.isSafeInteger(lib.id) ||
    lib.id <= 0 ||
    typeof lib.name !== 'string' ||
    !lib.name.trim() ||
    lib.name.length > 200 ||
    !validCoordinates(lib.lat, lib.lng)
  )
    return null
  const name = lib.name.trim()
  return {
    mode: 'library',
    libraryId: lib.id,
    libraryName: name,
    label: name,
    lat: lib.lat,
    lng: lib.lng,
  }
}
/** Treat storage as untrusted; an old GPS fix is not the current position. */
export function restoreLocation(saved: string | null): LocationContext {
  try {
    const row = JSON.parse(saved ?? 'null')
    if (!row || typeof row !== 'object') return DEFAULT_LOCATION
    if (row.mode === 'region' && typeof row.regionSlug === 'string')
      return regionLocation(row.regionSlug) ?? DEFAULT_LOCATION
    if (row.mode === 'library')
      return (
        libraryLocation({ id: row.libraryId, name: row.libraryName, lat: row.lat, lng: row.lng }) ??
        DEFAULT_LOCATION
      )
    if (row.mode === 'gps' && validCoordinates(row.lat, row.lng))
      return { mode: 'gps', lat: row.lat, lng: row.lng, label: '저장된 GPS 위치', isSaved: true }
  } catch {
    /* invalid JSON/storage is the normal first-visit fallback */
  }
  return DEFAULT_LOCATION
}
export function locationDescription(location: LocationContext) {
  if (location.mode === 'region')
    return {
      title: '기준 지역',
      label: location.label,
      detail: '선택 지역의 중심 좌표 주변을 조회합니다. 내 현재 위치가 아닙니다.',
    }
  if (location.mode === 'library')
    return {
      title: '기준 도서관',
      label: location.libraryName,
      detail: '선택한 도서관의 좌표 주변을 조회합니다. 내 현재 위치가 아닙니다.',
    }
  return {
    title: location.isSaved ? '저장된 GPS 기준' : 'GPS 기준',
    label: location.label,
    detail: location.isSaved
      ? '이전에 저장한 좌표입니다. 현재 위치는 다시 확인해 주세요.'
      : '방금 확인한 GPS 좌표 주변을 조회합니다.',
  }
}
