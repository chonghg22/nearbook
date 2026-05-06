import { BookOpen, Heart, Star, Settings } from 'lucide-react'
import type { NavItem } from './types'

export const userNavItems: NavItem[] = [
  { label: '내 책장', href: '/me', icon: BookOpen, requireAuth: true },
  { label: '위시리스트', href: '/me/wishlist', icon: Heart, requireAuth: true },
  { label: '즐겨찾기 도서관', href: '/me/libraries', icon: Star, requireAuth: true },
  // TODO Phase 1: 설정 페이지 구현 후 활성
  { label: '설정', href: '/me/settings', icon: Settings, requireAuth: true, disabled: true, disabledReason: '준비 중' },
]
