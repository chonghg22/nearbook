import { TrendingUp, MapPin, Bookmark } from 'lucide-react'
import type { NavItem } from './types'

// TODO Phase 1: 페이지 구현 후 disabled 제거
// - /popular  → 인기도서 페이지
// - /region   → 지역별 인기도서 페이지
// - /category → 카테고리별 페이지
export const primaryNavItems: NavItem[] = [
  { label: '인기도서', href: '/popular', icon: TrendingUp, disabled: true, disabledReason: '준비 중' },
  { label: '지역별', href: '/region', icon: MapPin, disabled: true, disabledReason: '준비 중' },
  { label: '카테고리', href: '/category', icon: Bookmark, disabled: true, disabledReason: '준비 중' },
]
