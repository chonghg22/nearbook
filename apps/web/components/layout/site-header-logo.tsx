import Link from 'next/link'
import { BrandMark } from './brand-mark'

export function SiteHeaderLogo() {
  return (
    <Link href="/" aria-label="우리동네책 홈" className="flex shrink-0 items-center gap-2">
      <BrandMark />
      <span className="hidden text-lg font-bold sm:inline">우리동네책</span>
    </Link>
  )
}
