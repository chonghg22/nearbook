export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-canvas-subtle">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">우리동네책</p>
            <p className="text-xs text-muted-foreground mt-1">
              전국 1,400+ 공공도서관 통합 검색
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {[
              { href: '/terms',   label: '이용약관' },
              { href: '/privacy', label: '개인정보처리방침' },
              { href: '/about',   label: '서비스 소개' },
              { href: '/contact', label: '문의' },
              { href: '/notices', label: '공지사항' },
              { href: '/feedback', label: '오류 신고 · 개선 제안' },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="hover:text-foreground transition-colors">
                {label}
              </a>
            ))}
          </nav>
        </div>
        <p className="mt-6 text-xs text-subtle-foreground">
          도서 소장·대출 정보는 도서관 정보나루 OpenAPI를 통해 제공됩니다.
          실제 정보와 다를 수 있으니 도서관에 직접 확인하세요.
        </p>
      </div>
    </footer>
  )
}
