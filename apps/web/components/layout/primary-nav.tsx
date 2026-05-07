'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { primaryNavItems } from '@/lib/nav/primary-nav.config'
import { cn } from '@/lib/utils'

export function PrimaryNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="주 메뉴">
      <ul className="flex items-center gap-1">
        {primaryNavItems.map((item) => {
          const childItems = item.children ?? []
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + '/') ||
            childItems.some((child) => pathname === child.href || pathname.startsWith(child.href + '/'))

          if (childItems.length > 0) {
            return (
              <li key={item.href}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-100',
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 bg-white">
                    {childItems.map((child) => {
                      const ChildIcon = child.icon
                      return (
                        <DropdownMenuItem key={child.href} asChild className="cursor-pointer focus:bg-gray-100">
                          <Link href={child.href} className="flex items-center gap-2">
                            {ChildIcon && <ChildIcon className="h-4 w-4 text-gray-500" />}
                            <span>{child.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          }

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
