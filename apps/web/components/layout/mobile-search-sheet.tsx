'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SearchBar } from '@/components/search/search-bar'
import { POPULAR_QUERIES } from '@/lib/constants'
import Link from 'next/link'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileSearchSheet({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-[85vh] px-4 pt-12">
        <SheetHeader className="sr-only">
          <SheetTitle>책 검색</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <SearchBar 
            autoFocus 
            onSubmitted={() => onOpenChange(false)} 
            placeholder="어떤 책을 찾으시나요?"
          />
          
          <div className="mt-8">
            <p className="text-sm font-semibold text-gray-900 mb-4">🔥 지금 인기 있는 검색어</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_QUERIES.map((q) => (
                <Link
                  key={q}
                  href={`/search?q=${encodeURIComponent(q)}`}
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-700 hover:bg-gray-200 transition"
                >
                  {q}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
