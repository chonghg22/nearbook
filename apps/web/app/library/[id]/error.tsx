'use client'

import { DetailError } from '@/components/detail-error'

export default function LibraryError({ reset }: { reset: () => void }) {
  return <DetailError reset={reset} />
}
