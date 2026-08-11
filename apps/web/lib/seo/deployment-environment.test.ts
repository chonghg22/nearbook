import { afterEach, describe, expect, it, vi } from 'vitest'
import { isProductionDeployment } from './deployment-environment'

const PRODUCTION_SITE_URL = 'https://www.near-book.com'
const PREVIEW_SITE_URL = 'https://nearbook-git-feature-team.vercel.app'

describe('배포 환경 판별', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('APP_ENV가 production이면 다른 값과 무관하게 운영으로 판단한다', () => {
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', PREVIEW_SITE_URL)

    expect(isProductionDeployment()).toBe(true)
  })

  it('APP_ENV가 production이 아니면 운영 도메인이어도 운영이 아니다', () => {
    vi.stubEnv('APP_ENV', 'preview')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', PRODUCTION_SITE_URL)

    expect(isProductionDeployment()).toBe(false)
  })

  it('VERCEL_ENV가 preview면 NEXT_PUBLIC_SITE_URL이 운영 도메인이어도 운영이 아니다', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', PRODUCTION_SITE_URL)

    expect(isProductionDeployment()).toBe(false)
  })

  it('VERCEL_ENV가 development면 운영이 아니다', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', PRODUCTION_SITE_URL)

    expect(isProductionDeployment()).toBe(false)
  })

  it('운영 도메인이 아닌 preview 도메인은 운영이 아니다', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', PREVIEW_SITE_URL)

    expect(isProductionDeployment()).toBe(false)
  })

  it('운영 도메인과 VERCEL_ENV production이 함께 있으면 운영이다', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', PRODUCTION_SITE_URL)

    expect(isProductionDeployment()).toBe(true)
  })

  it('www 없는 운영 도메인도 운영으로 인정한다', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://near-book.com')

    expect(isProductionDeployment()).toBe(true)
  })

  it('NEXT_PUBLIC_SITE_URL이 없으면 안전하게 운영이 아니라고 판단한다', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

    expect(isProductionDeployment()).toBe(false)
  })

  it('잘못된 형식의 NEXT_PUBLIC_SITE_URL은 운영이 아니라고 판단한다', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'near-book.com')

    expect(isProductionDeployment()).toBe(false)
  })

  it('로컬 개발(VERCEL_ENV 없음, NODE_ENV development)은 운영이 아니다', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', PRODUCTION_SITE_URL)
    vi.stubEnv('NODE_ENV', 'development')

    expect(isProductionDeployment()).toBe(false)
  })
})
