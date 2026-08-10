import Link from 'next/link'

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

// 토큰이 포함된 1회성 링크라 색인 대상이 아니다.
export const metadata = {
  title: '이메일 알림 해지',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams?: Promise<{ token?: string }>
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined
  const token = params?.token?.trim()

  let success = false

  if (token) {
    const res = await fetch(`${API_URL}/unsubscribe?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })
    success = res.ok
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          {success ? '알림을 껐습니다' : '해지 링크를 확인해 주세요'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-gray-600">
          {success
            ? '이제 위시 도착 이메일은 보내지 않습니다. 나중에 다시 받고 싶으면 내 알림 설정에서 언제든 켤 수 있습니다.'
            : '유효하지 않거나 만료된 링크입니다. 로그인 후 알림 설정 페이지에서 직접 변경해 주세요.'}
        </p>
        <div className="mt-6">
          <Link
            href={success ? '/me/notifications' : '/me'}
            className="inline-flex rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          >
            설정으로 이동
          </Link>
        </div>
      </div>
    </main>
  )
}
