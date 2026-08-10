import Link from 'next/link'

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

// 토큰이 포함된 1회성 링크라 색인 대상이 아니다.
export const metadata = {
  title: '이메일 주기 변경',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams?: Promise<{ token?: string }>
}

export default async function DigestDowngradePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined
  const token = params?.token?.trim()

  let success = false

  if (token) {
    const res = await fetch(`${API_URL}/digest/downgrade?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })
    success = res.ok
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          {success ? '이제 주 1회로 보내드릴게요' : '변경 링크를 확인해 주세요'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-gray-600">
          {success
            ? '앞으로는 월요일 아침에 지난 한 주 동안 도착한 책을 모아서 보내드립니다.'
            : '유효하지 않거나 만료된 링크입니다. 로그인 후 알림 설정에서 직접 변경해 주세요.'}
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
