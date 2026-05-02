export function getStaticMapUrl(
  lat: number,
  lng: number,
  options: { w?: number; h?: number; level?: number } = {}
) {
  const { w = 600, h = 400, level = 15 } = options
  return `/api/static-map?lat=${lat}&lng=${lng}&w=${w}&h=${h}&level=${level}`
}

export function openNaverDirections(lat: number, lng: number, name: string) {
  const isMobile = /iPhone|iPad|Android/.test(navigator.userAgent)
  if (isMobile) {
    const appUrl = `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}&appname=nearbook`
    const webFallback = `https://map.naver.com/p/directions/-/-/${lng},${lat},${encodeURIComponent(name)}/-/transit`
    window.location.href = appUrl
    setTimeout(() => { window.location.href = webFallback }, 800)
  } else {
    window.open(
      `https://map.naver.com/p/directions/-/-/${lng},${lat},${encodeURIComponent(name)}/-/transit`,
      '_blank'
    )
  }
}

export function openKakaoDirections(lat: number, lng: number, name: string) {
  const isMobile = /iPhone|iPad|Android/.test(navigator.userAgent)
  if (isMobile) {
    const appUrl = `kakaomap://route?ep=${lat},${lng}&by=PUBLICTRANSIT`
    const webFallback = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`
    window.location.href = appUrl
    setTimeout(() => { window.location.href = webFallback }, 800)
  } else {
    window.open(`https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`, '_blank')
  }
}

export type MapApp = 'naver' | 'kakao'

export function getPreferredMapApp(): MapApp {
  if (typeof window === 'undefined') return 'naver'
  return (localStorage.getItem('preferredMap') as MapApp) || 'naver'
}

export function setPreferredMapApp(app: MapApp) {
  localStorage.setItem('preferredMap', app)
}
