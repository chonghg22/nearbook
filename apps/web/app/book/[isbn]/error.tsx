'use client'

import { DetailError } from '@/components/detail-error'

export default function BookError({ reset }: { reset: () => void }) {
  return <DetailError reset={reset} />
}
