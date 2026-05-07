'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { MobileNavSheet } from './mobile-nav-sheet'

export function MobileNavTrigger() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="메뉴 열기"
          className="flex h-10 w-10 min-h-0 min-w-0 items-center justify-center rounded-md hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(18rem,calc(100vw-4rem))] max-w-[calc(100vw-4rem)] p-5">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle>메뉴</SheetTitle>
        </SheetHeader>
        <MobileNavSheet onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
