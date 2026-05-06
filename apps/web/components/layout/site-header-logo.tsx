import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export function SiteHeaderLogo() {
  return (
    <Link href="/" aria-label="우리동네책 홈" className="flex shrink-0 items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
        <BookOpen className="h-5 w-5" />
      </div>
      <span className="hidden text-lg font-bold sm:inline">우리동네책</span>
    </Link>
  )
}
