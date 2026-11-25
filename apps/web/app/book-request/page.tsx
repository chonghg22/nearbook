import type { Metadata } from 'next'
import { BookRequest } from './request-form'

export const metadata: Metadata = {
  title: '도서 정보 가져오기 | 우리동네책',
  robots: { index: false, follow: true },
}

export default async function BookRequestPage({ searchParams }: { searchParams: Promise<{ isbn?: string }> }) {
  const { isbn } = await searchParams
  return <main className="mx-auto max-w-lg px-6 py-16">
    <h1 className="text-2xl font-bold">도서 정보 가져오기</h1>
    <p className="mt-4">처음 찾는 책은 확인 후 도서 정보를 가져옵니다. 이미 준비된 책은 로그인 없이 볼 수 있습니다.</p>
    <BookRequest isbn={typeof isbn === 'string' ? isbn : ''} />
  </main>
}
