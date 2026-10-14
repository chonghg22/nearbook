import Link from 'next/link'

export const metadata = {
  title: '오프라인',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center px-6 py-12">
      <div className="w-full rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">인터넷 연결이 끊겼어요</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          개인정보와 도서 보유·대출 상태는 오프라인에서 표시하지 않습니다.
          인터넷에 연결한 뒤 다시 확인해 주세요.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          연결 후 홈으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
