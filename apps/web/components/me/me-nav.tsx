'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/me', label: '대시보드' },
  { href: '/me/wishlist', label: '위시리스트' },
  { href: '/me/libraries', label: '내 도서관' },
  { href: '/me/notifications', label: '알림 설정' },
]

export function MeNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 mb-8 border-b pb-2">
      {navItems.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === href
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
