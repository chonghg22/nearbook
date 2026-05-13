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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.near-book.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { template: '%s | 우리동네책', default: '우리동네책 — 동네 도서관 책 찾기' },
  description: '전국 1,400+ 공공도서관에서 책을 빠르게 찾아 빌리세요.',
  applicationName: '우리동네책',
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
  themeColor: '#0f172a',
  alternates: {
    canonical: '/',
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
