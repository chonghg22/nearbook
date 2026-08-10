import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import { buildFaqJsonLd } from '@/lib/seo/json-ld'
import { buildPageMetadata } from '@/lib/seo/metadata'

const PAGE_PATH = '/qna'
const PAGE_TITLE = '묻고답하기'

export const metadata: Metadata = buildPageMetadata({
  path: PAGE_PATH,
  title: PAGE_TITLE,
  description: '우리동네책 서비스 이용 중 자주 묻는 질문과 답변을 모았습니다.',
})

/**
 * FAQPage 구조화 데이터는 이 배열 하나만 보고 만든다.
 * 화면에 보이는 질문·답변과 JSON-LD가 어긋나면 리치 결과 위반이 된다.
 */
const QNA_ITEMS = [
  {
    question: '검색 결과에 원하는 책이 보이지 않아요.',
    answer: '도서관 제공 데이터와 서지 정보 반영 시점에 따라 일부 책이 늦게 표시될 수 있습니다.',
  },
  {
    question: '도서관 위치나 소장 정보가 실제와 달라요.',
    answer: '도서관 시스템 변경이나 데이터 동기화 지연이 원인일 수 있습니다. 오류신고&건의사항 메뉴로 알려주세요.',
  },
  {
    question: '서비스 개선 의견은 어디로 보내면 되나요?',
    answer: '상단 고객센터 메뉴의 오류신고&건의사항 페이지에서 자유롭게 보내실 수 있습니다.',
  },
]

export default function QnaPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <JsonLd data={buildFaqJsonLd({ path: PAGE_PATH, items: QNA_ITEMS })} />

      <header className="mb-8">
        <h1 className="text-2xl font-bold">{PAGE_TITLE}</h1>
        <p className="mt-2 text-gray-600">서비스 이용 중 자주 묻는 내용을 정리했습니다.</p>
      </header>

      <div className="divide-y rounded-lg border bg-white">
        {QNA_ITEMS.map((item) => (
          <section key={item.question} className="px-4 py-5">
            <h2 className="font-semibold text-gray-900">Q. {item.question}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">A. {item.answer}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm text-gray-600">
        찾는 답이 없다면{' '}
        <Link href="/feedback" className="font-semibold text-primary-700 hover:underline">
          오류신고&건의사항
        </Link>
        으로 알려주세요.
      </p>
    </article>
  )
}
