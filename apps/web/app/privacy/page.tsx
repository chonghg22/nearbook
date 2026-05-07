import type { Metadata } from 'next'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'chonghg22@gmail.com'
const UPDATED_AT = '2026년 5월 7일'

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '우리동네책 개인정보처리방침',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm text-gray-500">시행일: {UPDATED_AT}</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">개인정보처리방침</h1>
        <p className="mt-3 text-gray-600">
          우리동네책은 서비스 제공에 필요한 최소한의 개인정보를 처리합니다.
        </p>
      </header>

      <div className="space-y-8 text-sm leading-7 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. 처리하는 개인정보 항목</h2>
          <p className="mt-2">
            로그인 시 Supabase 인증을 통해 사용자 식별자, 이메일, 닉네임 정보가 처리될 수 있습니다.
            위시리스트, 내 도서관 카드, 피드백 작성 내용, 선택 입력한 답변 받을 이메일도 서비스 기능 제공을 위해 저장됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. 위치 정보와 로컬 저장소</h2>
          <p className="mt-2">
            현재 위치 기반 도서관 검색은 사용자가 브라우저 위치 권한을 허용한 경우에만 동작합니다.
            선택한 지역, 도서관, 지도 앱 선호값, 위치 권한 선택 상태 등은 편의 기능을 위해 브라우저 localStorage에 저장될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. 자동 수집 정보</h2>
          <p className="mt-2">
            서비스 안정성, 보안, 오류 대응을 위해 접속 로그, 요청 URL, 사용자 에이전트, API 사용량 정보가 처리될 수 있습니다.
            오류신고&건의사항 제출 시 작성 페이지 URL과 사용자 에이전트가 함께 저장될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. 개인정보 이용 목적</h2>
          <p className="mt-2">
            개인정보는 로그인 상태 유지, 위시리스트와 내 도서관 관리, 문의 답변, 오류 확인,
            서비스 악용 방지, 품질 개선 목적에 한해 이용됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. 보관 기간</h2>
          <p className="mt-2">
            회원 정보와 개인화 데이터는 서비스 이용 기간 동안 보관하며, 삭제 요청 또는 운영상 보관 필요가 없어진 경우 지체 없이 삭제합니다.
            피드백과 문의 내용은 처리 이력 관리를 위해 필요한 기간 동안 보관할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. 제3자 서비스</h2>
          <p className="mt-2">
            인증에는 Supabase가 사용되며, 광고 제공을 위해 Google AdSense가 쿠키 등 식별 기술을 사용할 수 있습니다.
            도서 정보와 도서관 정보는 도서관 정보나루, 알라딘 등 외부 데이터 제공처를 통해 조회될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. 개인정보의 제3자 제공</h2>
          <p className="mt-2">
            우리동네책은 법령에 따른 경우 또는 사용자의 별도 동의가 있는 경우를 제외하고 개인정보를 제3자에게 판매하거나 임의 제공하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. 이용자의 권리</h2>
          <p className="mt-2">
            사용자는 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.
            계정 또는 피드백 데이터 삭제가 필요한 경우 아래 연락처로 요청해 주세요.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">9. 문의처</h2>
          <p className="mt-2">
            개인정보 관련 문의는 아래 이메일로 연락해 주세요.
          </p>
          <p className="mt-2">
            이메일: <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>
          </p>
        </section>
      </div>
    </article>
  )
}
