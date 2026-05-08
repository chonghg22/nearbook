import Link from 'next/link'
import type { Metadata } from 'next'
import { Bookmark, Flame, Sparkles, Tags, TrendingUp } from 'lucide-react'
import { ExploreShell } from './_components/explore-ui'

export const metadata: Metadata = {
  title: '탐색 | 우리동네책',
  description: '인기도서, 카테고리, 키워드, 급상승 도서, 신착도서를 탐색하세요.',
}

const items = [
  { href: '/popular', title: '인기도서', description: '매일 저장된 인기대출도서', icon: TrendingUp },
  { href: '/category', title: '카테고리', description: '캐시된 도서 분류별 탐색', icon: Tags },
  { href: '/keywords', title: '이달의 키워드', description: '월간 키워드로 바로 검색', icon: Sparkles },
  { href: '/rising', title: '대출 급상승 도서', description: '최근 순위가 빠르게 오른 책', icon: Flame },
  { href: '/new-books', title: '새로 들어온 책', description: '도서관 선택 후 신착도서 확인', icon: Bookmark },
]

export default function ExplorePage() {
  return (
    <ExploreShell
      title="탐색"
      description="외부 API를 매번 호출하지 않고, 저장된 큐레이션 데이터와 캐시된 도서 데이터를 중심으로 책을 둘러봅니다."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-md"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black text-gray-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">{item.description}</p>
            </Link>
          )
        })}
      </div>
    </ExploreShell>
  )
}
