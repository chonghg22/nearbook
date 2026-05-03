'use client'

import Link from 'next/link'
import { BookOpen, Search, Heart, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function HeaderClient({ nickname }: { nickname?: string | undefined }) {
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
    <header className="sticky top-0 z-50 w-full bg-canvas/90 backdrop-blur-md border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 shrink-0 min-h-0 min-w-0">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-base tracking-tight text-foreground">
            우리동네책
          </span>
        </Link>

        {/* 데스크톱 검색 */}
        <Link
          href="/search"
          className="hidden md:flex flex-1 max-w-sm items-center gap-2
                     bg-input border border-border rounded-full px-4 py-2
                     text-sm text-muted-foreground hover:border-primary/40
                     transition-colors shadow-input min-h-0"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span>책 제목, 저자, ISBN 검색</span>
        </Link>

        {/* 우측 액션 */}
        <nav className="flex items-center gap-1">
          {/* 모바일 검색 아이콘 */}
          <Link
            href="/search"
            className="md:hidden flex items-center justify-center
                       w-9 h-9 rounded-full hover:bg-canvas-muted transition-colors"
            aria-label="검색"
          >
            <Search className="w-4.5 h-4.5 text-muted-foreground" />
          </Link>

          {/* 위시리스트 */}
          <Link
            href="/me/wishlist"
            className="flex items-center justify-center
                       w-9 h-9 rounded-full hover:bg-canvas-muted transition-colors"
            aria-label="위시리스트"
          >
            <Heart className="w-4.5 h-4.5 text-muted-foreground" />
          </Link>

          {/* 로그인 / 마이페이지 */}
          {nickname ? (
            <Link
              href="/me"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5
                         text-sm font-medium text-foreground
                         bg-white border border-border rounded-full
                         hover:border-primary/50 hover:text-primary
                         transition-colors shadow-card min-h-0"
            >
              내 책장
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5
                         text-sm font-medium text-foreground
                         bg-white border border-border rounded-full
                         hover:border-primary/50 hover:text-primary
                         transition-colors shadow-card min-h-0"
            >
              로그인
            </Link>
          )}

          {/* 모바일 햄버거 */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex items-center justify-center
                       w-9 h-9 rounded-full hover:bg-canvas-muted transition-colors"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            {menuOpen
              ? <X className="w-4.5 h-4.5 text-foreground" />
              : <Menu className="w-4.5 h-4.5 text-foreground" />
            }
          </button>
        </nav>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-canvas/95 backdrop-blur-md px-4 py-3 space-y-1">
          {[
            { href: '/search',       label: '책 검색' },
            { href: '/me',           label: '내 책장' },
            { href: '/me/wishlist',  label: '위시리스트' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-sm font-medium
                         text-muted-foreground hover:text-foreground
                         hover:bg-canvas-subtle transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border">
            {nickname ? (
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium
                           text-red-500 hover:bg-red-50 transition-colors"
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 rounded-md text-sm font-medium
                           text-primary hover:bg-primary/5 transition-colors"
              >
                로그인 / 회원가입
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
