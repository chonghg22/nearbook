import Link from 'next/link'
import type { Metadata } from 'next'
import { Bookmark, Flame, Library, Sparkles, Tags, TrendingUp } from 'lucide-react'
import { ExploreShell } from './_components/explore-ui'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildPageMetadata({
  path: '/explore',
  title: '어떤 책을 빌릴까',
  description:
    '인기 대출 도서, 분야별 추천, 이달의 키워드, 급상승 도서, 도서관 신착도서까지. 읽을 책을 고르는 다섯 가지 방법을 모았습니다.',
})

const items = [
  { href: '/popular', title: '인기 대출 도서', description: '전국 도서관에서 지금 가장 많이 빌려 가는 책', icon: TrendingUp },
  { href: '/category', title: '분야별 인기 도서', description: '소설, 경제·경영, 역사 등 관심 분야로 찾기', icon: Tags },
  { href: '/keywords', title: '이달의 키워드', description: '이번 달 사람들이 가장 많이 찾은 작가와 주제', icon: Sparkles },
  { href: '/rising', title: '대출 급상승 도서', description: '최근 대출이 크게 늘어난 화제의 책', icon: Flame },
  { href: '/new-books', title: '도서관 신착도서', description: '우리 동네 도서관에 새로 들어온 책', icon: Bookmark },
  { href: '/libraries', title: '우리 동네 도서관', description: '가까운 공공도서관 위치와 이용 정보', icon: Library },
]

export default function ExplorePage() {
  return (
    <ExploreShell
      title="어떤 책을 빌릴까"
      description="읽을 책을 고르는 다섯 가지 방법과, 그 책을 빌릴 수 있는 우리 동네 도서관을 함께 찾아보세요."
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
