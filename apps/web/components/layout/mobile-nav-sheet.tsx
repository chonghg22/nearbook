'use client'

import Link from 'next/link'
import { primaryNavItems } from '@/lib/nav/primary-nav.config'

export function MobileNavSheet({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav aria-label="모바일 메뉴" className="mt-6">
      <ul className="flex flex-col">
        {primaryNavItems.map((item) => {
          const Icon = item.icon
          if (item.disabled) {
            return (
              <li key={item.href}>
                <span
                  aria-disabled="true"
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-base text-gray-400"
                >
                  {Icon && <Icon className="h-5 w-5" />}
                  <span>{item.label}</span>
                  <span className="ml-auto text-xs">{item.disabledReason}</span>
                </span>
              </li>
            )
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-base text-gray-900 hover:bg-gray-100"
              >
                {Icon && <Icon className="h-5 w-5" />}
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
