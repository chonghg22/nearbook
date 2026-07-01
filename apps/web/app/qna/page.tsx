import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '자주 묻는 질문',
  description: '우리동네책의 예약 가능 여부, 데이터 정확도, 위치 권한, 제휴 링크 안내',
  alternates: { canonical: '/qna' },
}

const QNA_ITEMS = [
  {
    question: '우리동네책에서 도서관 예약까지 할 수 있나요?',
    answer: '아니요. 우리동네책은 공공도서관의 책 보유 여부와 대출 가능성을 확인하는 정보 서비스입니다. 실제 예약, 대출, 상호대차 신청은 각 도서관 홈페이지나 도서관 공식 앱에서 진행해야 합니다.',
  },
  {
    question: '대출 가능 정보는 실시간인가요?',
    answer: '도서관 정보나루와 각 도서관 제공 데이터를 기반으로 보여드리지만, 데이터 갱신 지연이나 도서관 현장 처리 상황에 따라 실제 상태와 다를 수 있습니다. 방문 전에는 해당 도서관에서 최종 확인해 주세요.',
  },
  {
    question: '검색 결과에 원하는 책이 보이지 않아요.',
    answer: '책 제목 전체 대신 일부 단어, 저자명, ISBN으로 다시 검색해 보세요. 외부 데이터 반영 시점에 따라 일부 책은 늦게 표시될 수 있습니다.',
  },
  {
    question: '도서관 위치나 소장 정보가 실제와 달라요.',
    answer: '도서관 시스템 변경, 외부 데이터 갱신 지연, 위치 정보 오류가 원인일 수 있습니다. 오류신고&건의사항 페이지에서 책 제목, 도서관명, 잘못된 내용을 함께 알려주시면 확인하겠습니다.',
  },
  {
    question: '위치 권한은 왜 필요한가요?',
    answer: '현재 위치에서 가까운 도서관을 거리순으로 보여드리기 위해 사용합니다. 위치 권한은 선택 사항이며, 거부해도 지역별 도서관이나 검색 기능은 계속 사용할 수 있습니다.',
  },
  {
    question: '로그인하지 않아도 사용할 수 있나요?',
    answer: '책 검색, 책 상세, 도서관 정보 확인은 로그인 없이 사용할 수 있습니다. 위시리스트, 내 도서관, 알림 설정처럼 개인화가 필요한 기능은 로그인이 필요합니다.',
  },
  {
    question: '구매·대여 옵션 링크는 광고인가요?',
    answer: '일부 외부 링크는 제휴 링크입니다. 사용자가 링크를 통해 결제하거나 가입하면 운영자가 일정 수수료를 받을 수 있지만, 사용자 결제 가격에는 영향을 주지 않습니다.',
  },
  {
    question: '위시리스트 알림은 어떤 기준으로 오나요?',
    answer: '내 기본 도서관과 위시리스트에 담은 책을 기준으로 대출 가능성이 확인될 때 묶음 알림을 보냅니다. 발송 시점 이후 실제 재고가 변동될 수 있으므로 도서관에서 최종 확인해 주세요.',
  },
  {
    question: '서비스 개선 의견은 어디로 보내면 되나요?',
    answer: '고객센터의 오류신고&건의사항 페이지에서 보내주세요. 데이터 오류, 사용성 문제, 기능 제안을 모두 받고 있습니다.',
  },
]

export default function QnaPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">자주 묻는 질문</h1>
        <p className="mt-2 text-gray-600">
          도서관 데이터, 대출 가능성, 위치 권한, 제휴 링크에 대해 자주 묻는 내용을 정리했습니다.
        </p>
      </header>

      <div className="divide-y rounded-lg border bg-white">
        {QNA_ITEMS.map((item) => (
          <section key={item.question} className="px-4 py-5">
            <h2 className="font-semibold text-gray-900">Q. {item.question}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">A. {item.answer}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
