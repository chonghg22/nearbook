'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { SearchBar } from '@/components/search/search-bar'
import { useVisualViewportHeight } from '@/lib/use-visual-viewport-height'

export function MobileSearchTrigger() {
  const [open, setOpen] = useState(false)
  const viewport = useVisualViewportHeight(open)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="검색 열기"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <Search className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(event) => {
          // Radix observes Escape in capture phase, before the combobox closes its popup.
          if (
            event.isComposing ||
            (event.target instanceof HTMLInputElement &&
              event.target.getAttribute('aria-expanded') === 'true')
          )
            event.preventDefault()
        }}
        style={{ maxHeight: viewport?.height, top: viewport?.top }}
        className="top-0 max-h-[85dvh] max-w-full translate-y-0 overflow-y-auto overscroll-contain rounded-none p-4 sm:max-w-2xl sm:rounded-lg"
      >
        <DialogHeader>
          <DialogTitle>검색</DialogTitle>
          <DialogDescription className="sr-only">
            책 제목·저자·ISBN으로 검색하거나 방향키로 추천 도서를 선택하세요.
          </DialogDescription>
        </DialogHeader>
        <SearchBar autoFocus inlineSuggestions onSubmitted={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
