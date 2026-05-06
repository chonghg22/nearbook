import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '오류 신고 · 개선 제안',
  description: '우리동네책 서비스에 대한 오류 신고, 개선 제안, 기타 문의를 보내주세요.',
  alternates: { canonical: '/feedback' },
}

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
