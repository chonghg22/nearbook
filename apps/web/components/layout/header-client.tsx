'use client'

import Link from 'next/link'
import { BookOpen, Search, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { SearchBar } from '@/components/search/search-bar'
import { MobileSearchSheet } from './mobile-search-sheet'

export function HeaderClient({ nickname }: { nickname?: string | undefined }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900 hidden sm:inline-block">
            우리동네책
          </span>
        </Link>

        {/* 데스크톱 검색바 (중앙) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-auto">
          <SearchBar />
        </div>

        {/* 우측 액션 */}
        <nav className="flex items-center gap-2">
          {/* 모바일 검색 아이콘 */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="검색"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>

          {/* 내 책장 버튼 (데스크톱) */}
          <Link
            href={nickname ? '/me/wishlist' : '/login?next=/me/wishlist'}
            className="hidden md:flex items-center px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
          >
            내 책장
          </Link>

          {/* 모바일 내 책장 버튼 (아이콘 없이 텍스트만) */}
          <Link
            href={nickname ? '/me/wishlist' : '/login?next=/me/wishlist'}
            className="md:hidden flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
          >
            내 책장
          </Link>

          {/* 모바일 햄버거 메뉴 (필요 시) */}
          {nickname && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {!nickname && (
            <Link
              href="/login"
              className="hidden md:block text-sm font-medium text-gray-500 hover:text-gray-900 ml-2"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>

      {/* 모바일 드롭다운 메뉴 (인증된 경우만) */}
      {menuOpen && nickname && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-2">
          <Link
            href="/me"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            마이페이지
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50"
          >
            로그아웃
          </button>
        </div>
      )}

      {/* 모바일 검색 Sheet */}
      <MobileSearchSheet open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </header>
  )
}
