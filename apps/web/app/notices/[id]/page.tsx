import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export const revalidate = 86400
export const dynamicParams = true

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL!

type Notice = {
  id: number
  title: string
  body: string
  category: 'general' | 'update' | 'maintenance'
  isPinned: boolean
  publishedAt: string
}

async function fetchNotice(id: string): Promise<Notice | null> {
  const res = await fetch(`${API_URL}/notices/${id}`, { next: { revalidate: 86400 } })
  if (!res.ok) return null
  const json = await res.json()
  return json.data
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const notice = await fetchNotice(id)
  if (!notice) return { title: '공지사항' }
  return {
    title: notice.title,
    description: notice.body.slice(0, 140),
    alternates: { canonical: `/notices/${notice.id}` },
    openGraph: { title: notice.title, description: notice.body.slice(0, 140) },
  }
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const notice = await fetchNotice(id)
  if (!notice) notFound()

  const dateLabel = new Date(notice.publishedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/notices" className="text-sm text-primary hover:underline">
        ← 공지사항 목록
      </Link>

      <header className="mt-4 pb-4 border-b">
        <h1 className="text-2xl font-bold leading-snug">{notice.title}</h1>
        <p className="mt-2 text-sm text-gray-500">{dateLabel}</p>
      </header>

      <div className="mt-6 whitespace-pre-line text-gray-800 leading-relaxed">{notice.body}</div>
    </article>
  )
}
