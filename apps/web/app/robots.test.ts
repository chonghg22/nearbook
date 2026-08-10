import { afterEach, describe, expect, it, vi } from 'vitest'
import robots from './robots'

describe('robots 메타 라우트', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('운영 배포는 공개 경로와 sitemap을 노출한다', () => {
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')

    const result = robots()

    expect(result.sitemap).toBe('https://www.near-book.com/sitemap.xml')
    expect(result.host).toBe('www.near-book.com')
    expect(Array.isArray(result.rules) ? result.rules[0] : result.rules).toMatchObject({
      userAgent: '*',
      allow: ['/'],
    })
  })

  it('개인 데이터와 인증 경로를 차단한다', () => {
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')

    const rules = robots().rules
    const publicRule = (Array.isArray(rules) ? rules[0] : rules)!
    const disallow = publicRule.disallow as string[]

    expect(disallow).toEqual(expect.arrayContaining(['/me/', '/auth/', '/api/', '/login']))
  })

  it('검색 결과 페이지는 metadata noindex로 처리하므로 robots에서 막지 않는다', () => {
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')

    const rules = robots().rules
    const publicRule = (Array.isArray(rules) ? rules[0] : rules)!

    expect(publicRule.disallow as string[]).not.toContain('/search')
  })

  it('AI 학습 크롤러 차단 규칙을 유지한다', () => {
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')

    const rules = robots().rules
    const aiRule = Array.isArray(rules) ? rules[1] : undefined

    expect(aiRule).toEqual({
      userAgent: ['GPTBot', 'Google-Extended', 'CCBot', 'anthropic-ai'],
      disallow: ['/'],
    })
  })

  it('preview 배포는 전체 경로를 차단하고 sitemap을 노출하지 않는다', () => {
    vi.stubEnv('APP_ENV', '')
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')

    const result = robots()

    expect(result).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] })
    expect(result.sitemap).toBeUndefined()
  })
})
