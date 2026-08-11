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
          최근에 본 책 페이지는 인터넷 없이도 다시 열 수 있어요.
        </p>
        <Link
          href="/me/wishlist"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          내 위시리스트 보기
        </Link>
      </div>
    </main>
  )
}
