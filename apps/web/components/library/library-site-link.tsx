'use client'

import type { ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { safeLibraryHomepage } from '@/lib/library-links.mjs'

export function LibrarySiteLink({
  href,
  libraryId,
  className,
  children,
}: {
  href: string
  libraryId: string
  className?: string
  children: ReactNode
}) {
  const url = safeLibraryHomepage(href)
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() =>
        trackEvent('library_click', {
          libraryId,
          action: 'library_site',
          source: 'library_detail',
        })
      }
    >
      {children}
    </a>
  )
}
