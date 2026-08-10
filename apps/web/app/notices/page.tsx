import Link from 'next/link'
import { Metadata } from 'next'
import { SERVER_API_BASE_URL } from '@/lib/constants'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 86400

const API_URL = SERVER_API_BASE_URL

export const metadata: Metadata = buildPageMetadata({
  path: '/notices',
  title: '공지사항',
  description: '우리동네책 서비스 공지·업데이트·점검 안내를 확인하세요.',
})

type NoticeItem = {
  id: number
  title: string
  category: 'general' | 'update' | 'maintenance'
  isPinned: boolean
  publishedAt: string
}

const CATEGORY_LABEL: Record<NoticeItem['category'], string> = {
  general: '일반',
  update: '업데이트',
  maintenance: '점검',
}

const CATEGORY_COLOR: Record<NoticeItem['category'], string> = {
  general: 'bg-gray-100 text-gray-700',
  update: 'bg-primary-100 text-primary-700',
  maintenance: 'bg-amber-100 text-amber-700',
}

async function fetchNotices(): Promise<NoticeItem[]> {
  const res = await fetch(`${API_URL}/notices?pageSize=50`, { next: { revalidate: 86400 } })
  if (!res.ok) return []
  const json = await res.json()
  return json.data
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default async function NoticesPage() {
  const notices = await fetchNotices()

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">공지사항</h1>
        <p className="mt-2 text-gray-600">서비스 업데이트와 점검 일정을 안내드립니다.</p>
      </header>

      {notices.length === 0 ? (
        <div className="rounded-lg border bg-gray-50 p-8 text-center text-gray-500">
          등록된 공지사항이 없습니다.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {notices.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notices/${n.id}`}
                className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50"
              >
                {n.isPinned && <span className="mt-1 text-amber-500">📌</span>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLOR[n.category]}`}>
                      {CATEGORY_LABEL[n.category]}
                    </span>
                    <time className="text-xs text-gray-500">{formatDate(n.publishedAt)}</time>
                  </div>
                  <p className="text-base font-medium text-gray-900 truncate">{n.title}</p>
                </div>
                <span className="text-gray-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
