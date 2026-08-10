import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import '@fontsource/pretendard/index.css'
import './globals.css'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { EmailStatusBannerGate } from '@/components/banner/email-status-banner-gate'
import { LocationProvider } from '@/lib/use-location-context'
import { RegisterSW } from '@/components/pwa/register-sw'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { PwaRouteTracker } from '@/components/pwa/pwa-route-tracker'
import { isProductionDeployment } from '@/lib/seo/deployment-environment'
import { getSiteOrigin } from '@/lib/seo/site-url'
import { buildVerificationMetadata, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo/metadata'

const isProduction = isProductionDeployment()

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: { template: `%s | ${SITE_NAME}`, default: '우리동네책 — 동네 도서관 책 찾기' },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // canonical은 각 페이지가 직접 선언한다.
  // 루트에 두면 metadata를 선언하지 않은 모든 하위 페이지가 "/"를 상속해 색인에서 빠진다.
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ko_KR',
    title: '우리동네책 — 동네 도서관 책 찾기',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    // 사이트 공용 OG 이미지가 아직 없으므로 존재하지 않는 asset을 가리키지 않는다.
    card: 'summary',
    title: '우리동네책 — 동네 도서관 책 찾기',
    description: SITE_DESCRIPTION,
  },
  robots: isProduction
    ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } }
    : { index: false, follow: false, googleBot: { index: false, follow: false } },
  ...(buildVerificationMetadata() ? { verification: buildVerificationMetadata() } : {}),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '우리동네책',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {adsenseClient && (
          <script
            key="google-adsense"
            async
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          />
        )}
      </head>
      <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-CD3HFBCTV9"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CD3HFBCTV9');
          `}
        </Script>
      <body className="antialiased min-h-screen bg-canvas flex flex-col">
        <RegisterSW />
        <PwaRouteTracker />
        <LocationProvider>
          <SiteHeader />
          <EmailStatusBannerGate />
          <main className="flex-1">
            {children}
          </main>
          <InstallPrompt />
          <SiteFooter />
        </LocationProvider>
      </body>
    </html>
  )
}
