import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDetailMetadata, buildPageMetadata, buildVerificationMetadata, stripBrandSuffix } from './metadata'

function stubProductionEnv() {
  vi.stubEnv('APP_ENV', 'production')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')
}

describe('metadata 생성', () => {
  beforeEach(() => {
    stubProductionEnv()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('페이지 title에 브랜드 suffix를 중복해서 넣지 않는다', () => {
    expect(stripBrandSuffix('인기도서 | 우리동네책')).toBe('인기도서')
    expect(stripBrandSuffix('도서관 | 우리동네책 | 우리동네책')).toBe('도서관')
    expect(stripBrandSuffix('인기도서')).toBe('인기도서')
  })

  it('title에 이미 붙은 브랜드 suffix를 제거한 값을 사용한다', () => {
    const metadata = buildPageMetadata({ path: '/popular', title: '인기도서 | 우리동네책' })

    expect(metadata.title).toBe('인기도서')
  })

  it('og:title에는 template이 적용되지 않으므로 브랜드를 한 번만 붙인다', () => {
    const metadata = buildPageMetadata({ path: '/popular', title: '인기도서' })

    expect(metadata.openGraph?.title).toBe('인기도서 | 우리동네책')
  })

  it('absoluteTitle이면 브랜드를 덧붙이지 않는다', () => {
    const metadata = buildPageMetadata({
      path: '/',
      title: '우리동네책 | 한국 공공도서관 통합 책 검색',
      absoluteTitle: true,
    })

    expect(metadata.title).toEqual({ absolute: '우리동네책 | 한국 공공도서관 통합 책 검색' })
    expect(metadata.openGraph?.title).toBe('우리동네책 | 한국 공공도서관 통합 책 검색')
  })

  it('indexable 페이지에 self canonical을 설정한다', () => {
    const metadata = buildPageMetadata({ path: '/library/111003', title: '도서관' })

    expect(metadata.alternates?.canonical).toBe('https://www.near-book.com/library/111003')
    expect(metadata.openGraph?.url).toBe('https://www.near-book.com/library/111003')
  })

  it('canonical과 openGraph URL이 항상 같은 값이다', () => {
    const metadata = buildPageMetadata({ path: '/category/novel', title: '소설' })

    expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical)
  })

  it('운영 배포에서 index 페이지는 색인을 허용한다', () => {
    const metadata = buildPageMetadata({ path: '/popular', title: '인기도서' })

    expect(metadata.robots).toMatchObject({ index: true, follow: true })
  })

  it('index가 false인 페이지는 색인을 막되 링크는 따라가게 한다', () => {
    const metadata = buildPageMetadata({ path: '/search', title: '책 검색', index: false })

    expect(metadata.robots).toMatchObject({ index: false, follow: true })
  })

  it('운영 배포가 아니면 robots를 noindex로 설정한다', () => {
    vi.stubEnv('APP_ENV', 'preview')

    const metadata = buildPageMetadata({ path: '/popular', title: '인기도서' })

    expect(metadata.robots).toMatchObject({ index: false, follow: false })
  })

  it('책 표지가 없으면 실제 공용 공유 카드를 사용한다', () => {
    const metadata = buildPageMetadata({ path: '/book/9788936434120', title: '소년이 온다' })

    expect(metadata.openGraph).toMatchObject({ images: [{ url: 'https://www.near-book.com/images/share-default.png', width: 1200, height: 630 }] })
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' })
  })

  it('이미지가 있을 때만 큰 트위터 카드를 사용한다', () => {
    const metadata = buildPageMetadata({
      path: '/book/9788936434120',
      title: '소년이 온다',
      images: [{ url: 'https://image.example.com/cover.jpg' }],
    })

    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' })
  })
})

describe('사이트 소유 확인 metadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('verification 환경변수가 없으면 verification을 출력하지 않는다', () => {
    stubProductionEnv()
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION', '')
    vi.stubEnv('NEXT_PUBLIC_NAVER_SITE_VERIFICATION', '')

    expect(buildVerificationMetadata()).toBeUndefined()
  })

  it('설정된 값만 verification에 포함한다', () => {
    stubProductionEnv()
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION', 'google-token')
    vi.stubEnv('NEXT_PUBLIC_NAVER_SITE_VERIFICATION', '')

    expect(buildVerificationMetadata()).toEqual({ google: 'google-token' })
  })

  it('운영 배포가 아니면 verification을 출력하지 않는다', () => {
    vi.stubEnv('APP_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION', 'google-token')

    expect(buildVerificationMetadata()).toBeUndefined()
  })
})

describe('detail metadata failure policy', () => {
  afterEach(() => vi.unstubAllEnvs())
  for (const value of [null, new Error('temporary upstream failure')]) {
    it('noindexes missing or failed detail data without canonical or a fabricated image', async () => {
      stubProductionEnv()
      const build = vi.fn()
      const metadata = await buildDetailMetadata(async () => { if (value instanceof Error) throw value; return value }, build)
      expect(metadata.robots).toMatchObject({ index: false })
      expect(metadata.alternates).toBeUndefined()
      expect(metadata.openGraph).toMatchObject({ images: [] })
      expect(build).not.toHaveBeenCalled()
    })
  }
  it('preserves the actual book cover but filters non-http image schemes', () => {
    stubProductionEnv()
    const metadata = buildPageMetadata({ path: '/book/9791161571195', images: [{ url: 'javascript:alert(1)' }, { url: 'https://images.example/cover.jpg' }] })
    expect(metadata.openGraph).toMatchObject({ images: [{ url: 'https://images.example/cover.jpg' }] })
  })
})
