import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSiteOrigin, toAbsoluteSiteUrl } from './site-url'

describe('사이트 URL 헬퍼', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('끝의 슬래시를 제거한 origin을 반환한다', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com/')

    expect(getSiteOrigin()).toBe('https://www.near-book.com')
  })

  it('경로가 포함된 값이 들어와도 origin만 사용한다', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com/some/path')

    expect(getSiteOrigin()).toBe('https://www.near-book.com')
  })

  it('형식이 깨진 값이면 기본 origin으로 되돌린다', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'near-book.com')
    vi.stubEnv('NODE_ENV', 'production')

    expect(getSiteOrigin()).toBe('https://www.near-book.com')
  })

  it('절대 canonical URL을 만든다', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')

    expect(toAbsoluteSiteUrl('/book/9788936434120')).toBe(
      'https://www.near-book.com/book/9788936434120',
    )
  })

  it('origin이 슬래시로 끝나도 경로에 슬래시가 겹치지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com/')

    expect(toAbsoluteSiteUrl('/popular')).toBe('https://www.near-book.com/popular')
  })

  it('쿼리와 해시를 제거한다', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')

    expect(toAbsoluteSiteUrl('/new-books?libraryId=111003#list')).toBe(
      'https://www.near-book.com/new-books',
    )
  })
})
