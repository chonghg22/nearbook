import { afterEach, it, expect, vi } from 'vitest'
import { GpsError, gpsErrorMessage, requestBrowserLocation } from './location-gps'

afterEach(() => vi.useRealTimers())
const position = { coords: { latitude: 37.5, longitude: 127 } } as GeolocationPosition
it('unsupported GPS has a manual-selection message', async () => {
  await expect(requestBrowserLocation()).rejects.toMatchObject({ kind: 'unsupported' })
  expect(gpsErrorMessage(new GpsError('unsupported'))).toContain('직접 선택')
})
for (const [code, kind] of [
  [1, 'denied'],
  [2, 'unavailable'],
  [3, 'timeout'],
] as const) {
  it(`GPS ${kind} is not mislabeled as denied`, async () => {
    const gps = {
      getCurrentPosition: (_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
        fail?.({ code } as GeolocationPositionError),
    }
    await expect(requestBrowserLocation(gps)).rejects.toMatchObject({ kind })
    expect(gpsErrorMessage(new GpsError(kind))).toContain('직접 선택')
  })
}
it('successful explicit GPS returns only validated coordinates', async () => {
  await expect(
    requestBrowserLocation({ getCurrentPosition: (ok) => ok(position) })
  ).resolves.toEqual({ lat: 37.5, lng: 127 })
})
it('invalid GPS coordinates cannot replace a manual region', async () => {
  await expect(
    requestBrowserLocation({
      getCurrentPosition: (ok) =>
        ok({ coords: { latitude: NaN, longitude: 127 } } as GeolocationPosition),
    })
  ).rejects.toMatchObject({ kind: 'unavailable' })
})
it('GPS has an application deadline even if the browser never calls back', async () => {
  vi.useFakeTimers()
  const result = requestBrowserLocation({ getCurrentPosition: () => {} }).catch((error) => error)
  await vi.advanceTimersByTimeAsync(8500)
  expect(await result).toMatchObject({ kind: 'timeout' })
})
it('cancelled dialog ignores a late GPS success', async () => {
  let success!: PositionCallback
  const controller = new AbortController()
  const result = requestBrowserLocation(
    {
      getCurrentPosition: (ok) => {
        success = ok
      },
    },
    controller.signal
  ).catch((error) => error)
  controller.abort()
  success(position)
  expect(await result).toMatchObject({ kind: 'cancelled' })
})
it('pre-cancelled GPS does not call the browser', async () => {
  const getCurrentPosition = vi.fn(),
    controller = new AbortController()
  controller.abort()
  await expect(
    requestBrowserLocation({ getCurrentPosition }, controller.signal)
  ).rejects.toMatchObject({ kind: 'cancelled' })
  expect(getCurrentPosition).not.toHaveBeenCalled()
})
it('unexpected browser failure remains sanitized and actionable', async () => {
  await expect(
    requestBrowserLocation({
      getCurrentPosition: () => {
        throw new Error('SECRET')
      },
    })
  ).rejects.toMatchObject({ kind: 'unavailable' })
  expect(gpsErrorMessage(new Error('SECRET'))).not.toContain('SECRET')
})
