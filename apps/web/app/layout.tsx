import type { Metadata } from 'next'
import Script from 'next/script'
import '@fontsource/pretendard/index.css'
import './globals.css'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { LocationProvider } from '@/lib/use-location-context'

export const metadata: Metadata = {
  title: { template: '%s | 우리동네책', default: '우리동네책 — 동네 도서관 책 찾기' },
  description: '전국 1,400+ 공공도서관에서 책을 빠르게 찾아 빌리세요.',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  themeColor: '#2F704F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  return (
    <html lang="ko">
      <head>
        {adsenseClient && (
          <Script
            id="google-adsense"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          />
        )}
      </head>
      <body className="antialiased min-h-screen bg-canvas flex flex-col">
        <LocationProvider>
          <SiteHeader />
          <main className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </LocationProvider>
      </body>
    </html>
  )
}
