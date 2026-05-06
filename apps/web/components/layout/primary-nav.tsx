'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { primaryNavItems } from '@/lib/nav/primary-nav.config'
import { cn } from '@/lib/utils'

export function PrimaryNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="주 메뉴">
      <ul className="flex items-center gap-1">
        {primaryNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          if (item.disabled) {
            return (
              <li key={item.href}>
                <span
                  aria-disabled="true"
                  title={item.disabledReason}
                  className="cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-gray-400"
                >
                  {item.label}
                </span>
              </li>
            )
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
