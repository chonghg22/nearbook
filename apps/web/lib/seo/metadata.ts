import type { Metadata } from 'next'
import { isProductionDeployment } from './deployment-environment'
import { toAbsoluteSiteUrl } from './site-url'

export const SITE_NAME = '우리동네책'
export const SITE_DESCRIPTION =
  '전국 공공도서관에 있는 책을 검색하고, 우리 동네 도서관의 소장 여부와 인기·신착 도서를 확인하세요.'

/**
 * 루트 layout의 title template이 이미 "| 우리동네책"을 붙인다.
 * 페이지가 직접 붙인 브랜드 suffix는 제거해서 중복 노출을 막는다.
 */
const BRAND_SUFFIX_PATTERN = /(\s*[|·\-—]\s*우리동네책\s*)+$/

export function stripBrandSuffix(title: string) {
  return title.replace(BRAND_SUFFIX_PATTERN, '').trim()
}

type OpenGraphImage = { url: string; alt?: string }

export type PageMetadataInput = {
  /** self canonical에 사용할 경로. 쿼리는 넣지 않는다. */
  path: string
  title?: string
  description?: string
  /** false면 해당 페이지만 noindex(follow는 유지). 기본 true. */
  index?: boolean
  openGraphType?: 'website' | 'article' | 'book' | 'profile'
  images?: OpenGraphImage[]
  /** title template을 무시하고 title을 그대로 쓸 때 사용(홈 전용). */
  absoluteTitle?: boolean
}

function buildRobots(index: boolean): Metadata['robots'] {
  // 운영 배포가 아니면 페이지 설정과 무관하게 전부 차단한다.
  if (!isProductionDeployment()) {
    return {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    }
  }

  if (!index) {
    // 색인은 막되 링크는 따라가게 해서 내부 링크 가치를 잃지 않는다.
    return { index: false, follow: true, googleBot: { index: false, follow: true } }
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  }
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const {
    path,
    title,
    description,
    index = true,
    openGraphType = 'website',
    images,
    absoluteTitle = false,
  } = input

  const canonical = toAbsoluteSiteUrl(path)
  const cleanTitle = title ? stripBrandSuffix(title) : undefined
  // og:title에는 template이 적용되지 않으므로 여기서 직접 브랜드를 붙인다.
  // absoluteTitle이면 title이 이미 완성형이라 브랜드를 덧붙이지 않는다.
  const ogTitle = cleanTitle
    ? absoluteTitle
      ? cleanTitle
      : `${cleanTitle} | ${SITE_NAME}`
    : SITE_NAME

  const metadata: Metadata = {
    alternates: { canonical },
    robots: buildRobots(index),
    openGraph: {
      type: openGraphType,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      url: canonical,
      title: ogTitle,
      ...(description ? { description } : {}),
      ...(images?.length ? { images } : {}),
    },
    twitter: {
      // 이미지가 있을 때만 큰 카드로 올린다. 이미지 없는 large 카드는 빈 영역만 남는다.
      card: images?.length ? 'summary_large_image' : 'summary',
      title: ogTitle,
      ...(description ? { description } : {}),
      ...(images?.length ? { images: images.map((image) => image.url) } : {}),
    },
  }

  if (cleanTitle) {
    metadata.title = absoluteTitle ? { absolute: cleanTitle } : cleanTitle
  }
  if (description) {
    metadata.description = description
  }

  return metadata
}

/**
 * Search Console / Naver Search Advisor 소유 확인 태그.
 * 값이 없으면 태그 자체를 만들지 않고, 운영 배포가 아니면 노출하지 않는다.
 */
export function buildVerificationMetadata(): Metadata['verification'] | undefined {
  if (!isProductionDeployment()) return undefined

  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()
  const naver = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION?.trim()

  if (!google && !naver) return undefined

  return {
    ...(google ? { google } : {}),
    ...(naver ? { other: { 'naver-site-verification': naver } } : {}),
  }
}
