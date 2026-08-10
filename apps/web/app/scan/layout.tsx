import type { Metadata } from 'next'

// 카메라를 쓰는 도구 화면이라 검색 결과에 노출할 콘텐츠가 없다.
export const metadata: Metadata = {
  title: '바코드 스캔',
  robots: { index: false, follow: true },
}

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children
}
