import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '우리동네책 — 동네 도서관에서 책 빌리기',
    short_name: '우리동네책',
    description: '한국 1,400+ 공공도서관 책 검색·예약 통합 사이트',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    lang: 'ko-KR',
    categories: ['books', 'education', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/mobile-book.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
      },
      {
        src: '/screenshots/mobile-search.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
      },
    ],
    shortcuts: [
      {
        name: '검색',
        url: '/search',
        icons: [{ src: '/icons/shortcut-search.png', sizes: '96x96', type: 'image/png' }],
      },
      {
        name: '바코드 스캔',
        url: '/scan',
        icons: [{ src: '/icons/shortcut-scan.png', sizes: '96x96', type: 'image/png' }],
      },
      {
        name: '내 위시',
        url: '/me/wishlist',
        icons: [{ src: '/icons/shortcut-wishlist.png', sizes: '96x96', type: 'image/png' }],
      },
    ],
  }
}
