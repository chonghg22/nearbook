/**
 * 배포 환경 판별.
 *
 * 원칙: 환경변수가 충돌하거나 불완전하면 **항상 noindex(비운영)** 쪽으로 판단한다.
 * preview 배포에 운영 도메인 값이 잘못 주입되는 사고가 실제로 흔하기 때문에,
 * NEXT_PUBLIC_SITE_URL 하나만으로 indexable해지는 경로를 만들지 않는다.
 */

const PRODUCTION_HOSTS = new Set(['near-book.com', 'www.near-book.com'])

function isProductionHost() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!configured) return false

  try {
    return PRODUCTION_HOSTS.has(new URL(configured).hostname)
  } catch {
    return false
  }
}

export function isProductionDeployment() {
  // 1. APP_ENV가 명시되어 있으면 이것만 신뢰한다.
  const appEnv = process.env.APP_ENV?.trim()
  if (appEnv) return appEnv === 'production'

  const vercelEnv = process.env.VERCEL_ENV?.trim()

  // 2. Vercel preview/development는 도메인 설정과 무관하게 비운영이다.
  if (vercelEnv && vercelEnv !== 'production') return false

  // 3~4. 운영 도메인이 아니거나 값이 깨져 있으면 비운영이다.
  if (!isProductionHost()) return false

  // 5. 여기까지 오면 운영 도메인이다. 실제 운영 실행인지 최종 확인한다.
  if (vercelEnv === 'production') return true
  return process.env.NODE_ENV === 'production'
}
