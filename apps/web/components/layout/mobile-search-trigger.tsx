'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SearchBar } from '@/components/search/search-bar'

export function MobileSearchTrigger() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="검색 열기"
          className="flex h-10 w-10 min-h-0 min-w-0 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <Search className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="top-0 max-w-full translate-y-0 rounded-none p-4 sm:top-[10%] sm:max-w-2xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>검색</DialogTitle>
        </DialogHeader>
        <SearchBar autoFocus onSubmitted={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
