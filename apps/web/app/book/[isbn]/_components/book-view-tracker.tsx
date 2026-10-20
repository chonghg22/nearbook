'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

interface Props {
  isbn: string
  title?: string | undefined
  author?: string | undefined
}

export function BookViewTracker({ isbn, title, author }: Props) {
  const lastIsbn = useRef<string | null>(null)
  useEffect(() => {
    if (lastIsbn.current === isbn) return
    lastIsbn.current = isbn
    trackEvent('book_detail_view', {
      isbn,
      title,
      author,
    })
  }, [author, isbn, title])

  return null
}
