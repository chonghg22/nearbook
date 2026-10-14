import { validCoordinates } from './location-state'

export type GpsErrorKind = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'cancelled'
export class GpsError extends Error {
  constructor(public readonly kind: GpsErrorKind) {
    super(`Location request failed: ${kind}`)
  }
}
export function gpsErrorMessage(error: unknown): string {
  const kind = error instanceof GpsError ? error.kind : 'unavailable'
  if (kind === 'denied')
    return '위치 권한이 거부됐습니다. 권한을 허용하지 않아도 지역이나 도서관을 직접 선택할 수 있습니다.'
  if (kind === 'timeout')
    return '위치 확인 시간이 초과됐습니다. 다시 시도하거나 지역을 직접 선택해 주세요.'
  if (kind === 'unsupported')
    return '이 브라우저에서는 GPS를 사용할 수 없습니다. 지역이나 도서관을 직접 선택해 주세요.'
  return '현재 위치를 확인하지 못했습니다. 다시 시도하거나 지역을 직접 선택해 주세요.'
}
/** Only invoked by the explicit GPS button, never at mount. */
export function requestBrowserLocation(
  geolocation?: Pick<Geolocation, 'getCurrentPosition'>,
  signal?: AbortSignal
): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new GpsError('cancelled'))
      return
    }
    if (!geolocation) {
      reject(new GpsError('unsupported'))
      return
    }
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (coords?: { lat: number; lng: number }, error?: GpsError) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (coords) resolve(coords)
      else reject(error ?? new GpsError('unavailable'))
    }
    const abort = () => finish(undefined, new GpsError('cancelled'))
    signal?.addEventListener('abort', abort, { once: true })
    timer = setTimeout(() => finish(undefined, new GpsError('timeout')), 8500)
    try {
      geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude,
            lng = pos.coords.longitude
          if (!validCoordinates(lat, lng)) {
            finish(undefined, new GpsError('unavailable'))
            return
          }
          finish({ lat, lng })
        },
        (error) =>
          finish(
            undefined,
            new GpsError(error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable')
          ),
        { timeout: 8000, maximumAge: 60000 }
      )
    } catch {
      finish(undefined, new GpsError('unavailable'))
    }
  })
}
