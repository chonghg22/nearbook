import { parseLibraryList } from './map-libraries.mjs'
import { ApiRequestError } from './api-request.mjs'
import type { LocationContext } from './location-state'

export interface HomeLibrary {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  distanceKm: number | null
}
export function nearbyLibrariesPath(location: LocationContext): string {
  const query = new URLSearchParams({
    lat: String(location.lat),
    lng: String(location.lng),
    radius: '5',
  })
  return `/libraries/near?${query}`
}
export function parseHomeLibraries(value: unknown): HomeLibrary[] {
  // /libraries/near currently returns a bare array; also accept the envelope
  // used by other library endpoints, without treating error objects as [].
  const response = Array.isArray(value) ? { data: value } : value
  const libraries = parseLibraryList(response)
  const rows = (response as { data: Array<{ distanceKm?: unknown }> }).data
  return libraries.slice(0, 12).map((library, index) => {
    const distance = rows[index]?.distanceKm
    if (
      distance != null &&
      (typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0)
    )
      throw new ApiRequestError('invalid-response')
    return { ...library, distanceKm: distance == null ? null : (distance as number) }
  })
}
export function formatReferenceDistance(distance: number | null): string | null {
  return distance === null ? null : `기준점에서 ${distance.toFixed(1)}km`
}
