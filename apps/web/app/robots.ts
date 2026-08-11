import type { MetadataRoute } from 'next'
import { isProductionDeployment } from '@/lib/seo/deployment-environment'
import { getSiteOrigin } from '@/lib/seo/site-url'

/** 색인 대상이 아닌 라우트. 색인 정책표의 noindex 집합과 일치해야 한다. */
const DISALLOWED_PATHS = [
  '/api/',
  '/auth-api/',
  '/auth/',
  '/admin/',
  '/me/',
  '/login',
  '/signup',
  '/scan',
  '/events',
  '/offline',
  '/unsubscribe',
  '/digest/',
]

export default function robots(): MetadataRoute.Robots {
  // preview/dev 배포는 통째로 차단하고 sitemap 위치도 알리지 않는다.
  if (!isProductionDeployment()) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: DISALLOWED_PATHS,
      },
      {
        // AI 학습 크롤러 차단 (기존 정책 유지)
        userAgent: ['GPTBot', 'Google-Extended', 'CCBot', 'anthropic-ai'],
        disallow: ['/'],
      },
    ],
    sitemap: `${getSiteOrigin()}/sitemap.xml`,
    host: new URL(getSiteOrigin()).host,
  }
}
