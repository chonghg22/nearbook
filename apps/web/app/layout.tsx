import type { Metadata } from 'next'
import '@fontsource/pretendard/index.css'
import './globals.css'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { EmailStatusBanner } from '@/components/banner/email-status-banner'
import { LocationProvider } from '@/lib/use-location-context'
import { createServerClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.near-book.com'
const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { template: '%s | 우리동네책', default: '우리동네책 — 동네 도서관 책 찾기' },
  description: '전국 1,400+ 공공도서관에서 책을 빠르게 찾아 빌리세요.',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  themeColor: '#2F704F',
  alternates: {
    canonical: '/',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let emailStatus: string | null = null

  if (session) {
    const res = await fetch(`${API_URL}/me/notification-preferences`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    }).catch(() => null)

    if (res?.ok) {
      const json = await res.json()
      emailStatus = json.data?.emailStatus ?? null
    }
  }

  return (
    <html lang="ko">
      <head>
        {adsenseClient && (
          <script
            key="google-adsense"
            async
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          />
        )}
      </head>
      <body className="antialiased min-h-screen bg-canvas flex flex-col">
        <LocationProvider>
          <SiteHeader />
          {emailStatus && <EmailStatusBanner status={emailStatus} />}
          <main className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </LocationProvider>
      </body>
    </html>
  )
}
