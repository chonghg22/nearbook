'use client'

import Link from 'next/link'
import { primaryNavItems } from '@/lib/nav/primary-nav.config'

export function MobileNavSheet({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav aria-label="모바일 메뉴" className="mt-6">
      <ul className="flex flex-col">
        {primaryNavItems.map((item) => {
          const Icon = item.icon
          const childItems = item.children ?? []
          if (childItems.length > 0) {
            return (
              <li key={item.href} className="py-1">
                <div className="flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-gray-900">
                  {Icon && <Icon className="h-5 w-5" />}
                  <span>{item.label}</span>
                </div>
                <ul className="ml-8 border-l border-gray-100 pl-2">
                  {childItems.map((child) => {
                    const ChildIcon = child.icon
                    if (child.disabled) {
                      return (
                        <li key={child.href}>
                          <span
                            aria-disabled="true"
                            className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-400"
                          >
                            {ChildIcon && <ChildIcon className="h-4 w-4" />}
                            <span>{child.label}</span>
                            {child.disabledReason && <span className="ml-auto text-xs">{child.disabledReason}</span>}
                          </span>
                        </li>
                      )
                    }
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={onNavigate}
                          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {ChildIcon && <ChildIcon className="h-4 w-4" />}
                          <span>{child.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          }

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
