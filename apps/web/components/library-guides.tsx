import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import { GUIDES_UPDATED_AT, LIBRARY_GUIDES, guideJsonLd, guidePath, type LibraryGuide } from '@/lib/library-guides'

export function LibraryGuideLinks() {
  return (
    <section aria-labelledby="library-guides-title" className="mx-auto max-w-5xl px-4 py-10">
      <h2 id="library-guides-title" className="text-xl font-bold text-gray-900">도서관 검색, 어디서부터 시작할까요?</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">공식 자료 검색부터 우리 동네에서 읽을 책을 찾는 방법까지 안내합니다.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {LIBRARY_GUIDES.map((guide) => (
          <Link key={guide.slug} href={guidePath(guide)} className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-primary hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <h3 className="font-semibold leading-7 text-gray-900">{guide.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{guide.description}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-primary-700">이용 방법 읽기 →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function LibraryGuideArticle({ guide }: { guide: LibraryGuide }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <JsonLd data={guideJsonLd(guide)} />
      <nav aria-label="현재 위치" className="mb-6 flex flex-wrap gap-2 text-sm text-gray-600">
        <Link href="/" className="hover:underline">홈</Link><span aria-hidden="true">/</span>
        <Link href="/guides" className="hover:underline">도서관 이용 가이드</Link>
      </nav>
      <article>
        <header>
          <p className="text-sm font-semibold text-primary-700">도서관 이용 가이드</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">{guide.title}</h1>
          <p className="mt-5 leading-8 text-gray-700">{guide.intro}</p>
          <p className="mt-4 text-xs text-gray-500">우리동네책 작성 · 공식 안내 확인 및 수정 <time dateTime={GUIDES_UPDATED_AT}>2026년 11월 2일</time></p>
          <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">우리동네책은 독립적으로 운영하는 공공도서관 책 검색 서비스입니다. 이 글은 기관의 공식 안내가 아니며, 실제 이용 조건은 해당 기관의 최신 안내를 확인해 주세요.</p>
          <a href={guide.officialUrl} className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary-700 underline underline-offset-4">{guide.officialLabel} 공식 사이트로 이동 →</a>
        </header>
        <nav aria-label="글 목차" className="my-8 rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold">이 글에서 확인할 내용</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-gray-700">
            {guide.sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className="underline underline-offset-4">{section.title}</a></li>)}
          </ol>
        </nav>
        <div className="space-y-10">
          {guide.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-xl font-bold leading-8 text-gray-900">{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 leading-8 text-gray-700">{paragraph}</p>)}
            </section>
          ))}
        </div>
        <section aria-labelledby="guide-search-title" className="my-10 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
          <h2 id="guide-search-title" className="text-xl font-bold">이 책, 가까운 도서관에도 있을까요?</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">찾아둔 책 제목이나 ISBN을 입력하세요. 검색 결과에서 책을 선택하면 소장 도서관을 확인할 수 있습니다.</p>
          <form action="/search" method="get" className="mt-5">
            <input type="hidden" name="source" value={`guide-${guide.slug}`} />
            <label htmlFor="guide-book-query" className="text-sm font-semibold">책 제목 또는 ISBN</label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input id="guide-book-query" name="q" type="search" required maxLength={200} placeholder="책 제목이나 ISBN 입력" className="min-h-12 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 focus:outline-primary" />
              <button type="submit" className="min-h-12 rounded-lg bg-primary px-5 font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">소장 도서관 찾기</button>
            </div>
          </form>
          <Link href="/libraries" className="mt-4 inline-block text-sm text-primary-700 underline underline-offset-4">지역별 도서관 먼저 살펴보기</Link>
        </section>
        <section aria-labelledby="guide-questions-title">
          <h2 id="guide-questions-title" className="text-xl font-bold">자주 묻는 질문</h2>
          {guide.questions.map((item) => <div key={item.question} className="mt-5"><h3 className="font-semibold leading-7">{item.question}</h3><p className="mt-2 leading-8 text-gray-700">{item.answer}</p></div>)}
        </section>
        <section aria-labelledby="guide-sources-title" className="mt-10 border-t pt-6">
          <h2 id="guide-sources-title" className="font-semibold">확인한 공식 자료</h2>
          <ul className="mt-3 space-y-3 text-sm leading-6">{guide.sources.map((source) => <li key={source.url}><a href={source.url} className="text-primary-700 underline underline-offset-4">{source.label}</a></li>)}</ul>
        </section>
      </article>
      <aside aria-label="함께 읽을 안내" className="mt-10 rounded-xl border p-5">
        <h2 className="font-semibold">함께 읽으면 좋은 안내</h2>
        {LIBRARY_GUIDES.filter((item) => item.slug !== guide.slug).map((item) => <Link key={item.slug} href={guidePath(item)} className="mt-3 block leading-7 text-primary-700 underline underline-offset-4">{item.title}</Link>)}
        <Link href="/qna" className="mt-3 block text-sm text-primary-700 underline underline-offset-4">우리동네책 이용 FAQ</Link>
      </aside>
    </main>
  )
}
