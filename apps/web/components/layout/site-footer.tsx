import Link from 'next/link'
import { BookOpen, Mail } from 'lucide-react'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'chonghg22@gmail.com'
const OPERATOR_NAME = process.env.NEXT_PUBLIC_OPERATOR_NAME ?? '우리동네책 운영자'

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* 브랜드 */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-gray-900">우리동네책</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              한국 1,400+ 공공도서관에서 책을 빠르게 찾고 빌려보세요.
            </p>
          </div>

          {/* 서비스 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">서비스</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li><Link href="/" className="hover:text-blue-600">홈</Link></li>
              <li><Link href="/search" className="hover:text-blue-600">책 검색</Link></li>
              <li><span className="cursor-not-allowed text-gray-400">인기도서 (준비 중)</span></li>
              <li><span className="cursor-not-allowed text-gray-400">지역별 도서관 (준비 중)</span></li>
            </ul>
          </div>

          {/* 정책 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">정책</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li><Link href="/terms" className="hover:text-blue-600">이용약관</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600">개인정보처리방침</Link></li>
              <li><Link href="/notices" className="hover:text-blue-600">공지사항</Link></li>
              <li><Link href="/qna" className="hover:text-blue-600">묻고답하기</Link></li>
              <li><Link href="/feedback" className="hover:text-blue-600">오류신고&건의사항</Link></li>
            </ul>
          </div>

          {/* 연락 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">연락</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${CONTACT_EMAIL}`} className="break-all hover:text-blue-600">
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="text-xs text-gray-500">{OPERATOR_NAME}</li>
              <li className="text-xs text-gray-500">서비스 문의와 데이터 오류 제보를 받습니다.</li>
            </ul>
          </div>
        </div>

        {/* Disclosure (한국 표시광고법 의무) */}
        <div className="mt-10 border-t border-gray-200 pt-6">
          <p className="text-xs leading-relaxed text-gray-500">
            우리동네책은 알라딘·예스24·교보문고·밀리의서재·리디·윌라 등 제휴 마케팅 프로그램의 일환으로 활동하며,
            사용자가 외부 링크를 클릭해 결제·가입 시 일정 수수료를 받을 수 있습니다.
            사용자 결제 가격에는 영향이 없습니다.
            본 사이트는 Google AdSense 광고를 제공하며, 쿠키를 통해 광고가 개인 맞춤될 수 있습니다.
          </p>
          <p className="mt-4 text-xs text-gray-500">
            도서 정보 출처: 도서관 정보나루(국립중앙도서관) · 알라딘
          </p>
        </div>

        {/* 카피라이트 */}
        <div className="mt-6 flex flex-col items-start justify-between gap-2 border-t border-gray-200 pt-6 text-xs text-gray-400 sm:flex-row sm:items-center">
          <span>© {year} 우리동네책. All rights reserved.</span>
          <span>한국 공공도서관 통합 책 검색</span>
        </div>
      </div>
    </footer>
  )
}
