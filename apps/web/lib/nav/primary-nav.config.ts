import {
  Bookmark,
  CircleHelp,
  Compass,
  Flame,
  Library,
  Megaphone,
  MessageSquareWarning,
  Sparkles,
  Tags,
  TrendingUp,
} from 'lucide-react'
import type { NavItem } from './types'

export const primaryNavItems: NavItem[] = [
  { label: '지역별 도서관', href: '/libraries', icon: Library },
  {
    label: '탐색',
    href: '/explore',
    icon: Compass,
    children: [
      { label: '인기도서', href: '/popular', icon: TrendingUp },
      { label: '카테고리', href: '/category', icon: Tags },
      { label: '이달의 키워드', href: '/keywords', icon: Sparkles },
      { label: '대출 급상승 도서', href: '/rising', icon: Flame },
      { label: '새로 들어온 책', href: '/new-books', icon: Bookmark },
    ],
  },
  {
    label: '고객센터',
    href: '/notices',
    icon: Megaphone,
    children: [
      { label: '공지사항', href: '/notices', icon: Megaphone },
      { label: '자주 묻는 질문', href: '/qna', icon: CircleHelp },
      { label: '오류신고&건의사항', href: '/feedback', icon: MessageSquareWarning },
    ],
  },
]
