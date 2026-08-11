import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'chonghg22@gmail.com'
const UPDATED_AT = '2026년 5월 7일'

export const metadata: Metadata = buildPageMetadata({
  path: '/terms',
  title: '이용약관',
  description: '우리동네책 서비스 이용약관입니다.',
})

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm text-gray-500">시행일: {UPDATED_AT}</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">이용약관</h1>
        <p className="mt-3 text-gray-600">
          이 약관은 우리동네책 서비스를 이용할 때 필요한 기본 조건과 책임 범위를 안내합니다.
        </p>
      </header>

      <div className="space-y-8 text-sm leading-7 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. 서비스 목적</h2>
          <p className="mt-2">
            우리동네책은 공공도서관 도서 검색, 도서관 위치 확인, 도서 소장·대출 가능 정보 확인,
            위시리스트와 내 도서관 관리 기능을 제공하는 정보 서비스입니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. 제공 정보의 출처와 정확성</h2>
          <p className="mt-2">
            도서·도서관·대출 관련 정보는 도서관 정보나루, 알라딘 등 외부 데이터와 각 도서관 제공 정보를
            기반으로 표시됩니다. 외부 데이터의 갱신 지연, 도서관 시스템 변경, 네트워크 오류 등에 따라
            실제 소장 상태나 대출 가능 여부와 다를 수 있으므로 방문 전 해당 도서관에 직접 확인해 주세요.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. 회원 기능</h2>
          <p className="mt-2">
            로그인 사용자는 위시리스트, 내 도서관 카드, 피드백 내역 등 개인화 기능을 이용할 수 있습니다.
            사용자는 본인 계정으로 발생한 서비스 이용 행위에 대해 관리 책임을 가집니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. 위치 기반 기능</h2>
          <p className="mt-2">
            사용자가 브라우저 위치 권한을 허용하면 현재 위치 주변 도서관을 찾는 기능을 제공합니다.
            위치 권한은 선택 사항이며, 거부해도 지역 선택 또는 기본 위치 기준으로 서비스를 이용할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. 금지 행위</h2>
          <p className="mt-2">
            서비스 안정성을 해치는 자동화 요청, 비정상적 대량 호출, 타인의 계정 도용, 허위 신고,
            서비스 또는 외부 데이터의 무단 수집·재배포 행위를 금지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. 광고와 제휴 링크</h2>
          <p className="mt-2">
            우리동네책은 Google AdSense 광고와 도서·콘텐츠 관련 제휴 링크를 표시할 수 있습니다.
            사용자가 외부 링크를 통해 결제 또는 가입하는 경우 서비스 운영자가 일정 수수료를 받을 수 있으며,
            사용자 결제 가격에는 영향을 주지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. 서비스 변경과 중단</h2>
          <p className="mt-2">
            외부 API 장애, 시스템 점검, 운영상 필요에 따라 서비스 일부가 변경되거나 일시 중단될 수 있습니다.
            중요한 변경 사항은 가능한 범위에서 공지사항을 통해 안내합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. 문의</h2>
          <p className="mt-2">
            서비스 이용 문의, 오류 신고, 권리 침해 신고는 이메일 또는 오류신고&건의사항 페이지로 접수할 수 있습니다.
          </p>
          <p className="mt-2">
            이메일: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
          </p>
        </section>
      </div>
    </article>
  )
}
