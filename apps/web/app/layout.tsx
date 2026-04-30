import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '우리동네책 — 공공도서관 책 검색',
  description: '전국 1,400+ 공공도서관에서 책을 빠르게 검색하고 소장 여부를 확인하세요.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
