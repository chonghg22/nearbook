import { Suspense } from 'react'
import { SiteHeaderLogo } from './site-header-logo'
import { PrimaryNav } from './primary-nav'
import { UserNav } from './user-nav'
import { MobileNavTrigger } from './mobile-nav-trigger'
import { MobileSearchTrigger } from './mobile-search-trigger'
import { SiteHeaderSearch } from './site-header-search'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 lg:gap-4 lg:px-8">
        <div className="lg:hidden">
          <MobileNavTrigger />
        </div>
        <SiteHeaderLogo />
        <div className="hidden lg:block">
          <PrimaryNav />
        </div>
        <div className="hidden flex-1 lg:flex lg:max-w-2xl lg:mx-2">
          <SiteHeaderSearch />
        </div>
        <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:gap-2">
          <div className="lg:hidden">
            <MobileSearchTrigger />
          </div>
          <Suspense fallback={<div className="w-20 h-9 rounded-full bg-gray-100 animate-pulse" />}>
            <UserNav />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
