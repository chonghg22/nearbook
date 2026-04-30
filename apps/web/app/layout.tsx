import type { Metadata } from 'next'
import '@fontsource/pretendard/index.css'
import './globals.css'
import { Header } from '@/components/layout/header'

export const metadata: Metadata = {
  title: { template: '%s | 우리동네책', default: '우리동네책 — 동네 도서관 책 찾기' },
  description: '전국 1,400+ 공공도서관에서 책을 빠르게 찾아 빌리세요.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  )
}
