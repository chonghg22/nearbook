'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

interface Props {
  isbn: string
  title?: string | undefined
  author?: string | undefined
}

export function BookViewTracker({ isbn, title, author }: Props) {
  useEffect(() => {
    trackEvent('book_detail_view', {
      isbn,
      title,
      author,
    })
  }, [author, isbn, title])

  return null
}
