'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { userNavItems } from '@/lib/nav/user-nav.config'
import { createClient } from '@/lib/supabase/client'

interface Props {
  nickname: string
  avatarUrl?: string | undefined
}

export function UserNavMenu({ nickname, avatarUrl }: Props) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()

    await Promise.allSettled([
      supabase.auth.signOut(),
      fetch('/auth-api/logout', { method: 'POST' }),
    ])

    router.push('/')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-gray-200 px-2.5 py-1.5 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
            {nickname.charAt(0)}
          </div>
        )}
        <span className="hidden max-w-[8rem] truncate sm:inline">{nickname}</span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white">
        <DropdownMenuLabel>{nickname}님</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userNavItems.map((item) => {
          const Icon = item.icon
          if (item.disabled) {
            return (
              <DropdownMenuItem key={item.href} disabled className="gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
                <span className="ml-auto text-xs text-gray-400">{item.disabledReason}</span>
              </DropdownMenuItem>
            )
          }
          return (
            <DropdownMenuItem key={item.href} asChild className="cursor-pointer focus:bg-gray-100">
              <Link href={item.href} className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
