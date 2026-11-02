import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LibraryGuideArticle, LibraryGuideLinks } from '@/components/library-guides'
import { LIBRARY_GUIDES, guideJsonLd, guideMetadata, guidePath } from './library-guides'

afterEach(() => vi.unstubAllEnvs())

describe('library guides discoverability and search handoff', () => {
  for (const guide of LIBRARY_GUIDES) {
    it(`serves crawlable content, official sources and a native search form: ${guide.slug}`, () => {
      vi.stubEnv('APP_ENV', 'production')
      vi.stubEnv('VERCEL_ENV', '')
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')
      const html = renderToStaticMarkup(createElement(LibraryGuideArticle, { guide }))
      expect((html.match(/<h1[ >]/g) ?? [])).toHaveLength(1)
      expect(html).toContain(guide.title)
      for (const source of guide.sources) expect(html).toContain(`href="${source.url}"`)
      for (const section of guide.sections) expect(html).toContain(section.paragraphs[0])
      expect(html).toMatch(/<form[^>]*action="\/search"[^>]*method="get"/)
      expect(html).toContain('name="q"')
      expect(html).toContain(`value="guide-${guide.slug}"`)
      const queryInput = html.match(/<input[^>]*id="guide-book-query"[^>]*>/)?.[0]
      expect(queryInput).toContain('name="q"')
      expect(queryInput).toContain('type="search"')
      expect(queryInput).toContain('required=""')
      expect(html).toContain('독립적으로 운영')
      const metadata = guideMetadata(guide)
      expect(metadata.alternates?.canonical).toBe(`https://www.near-book.com${guidePath(guide)}`)
      expect(metadata.robots).toMatchObject({ index: true, follow: true })
      const data = guideJsonLd(guide)
      expect(data['@graph'][0]).toMatchObject({ '@type': 'Article', headline: guide.title, mainEntityOfPage: metadata.alternates?.canonical })
      expect(html).toContain('application/ld+json')
    })
    it(`keeps previews out of the index: ${guide.slug}`, () => {
      vi.stubEnv('APP_ENV', 'production')
      vi.stubEnv('VERCEL_ENV', 'preview')
      expect(guideMetadata(guide).robots).toMatchObject({ index: false, follow: false })
      expect(renderToStaticMarkup(createElement(LibraryGuideArticle, { guide }))).not.toContain('application/ld+json')
    })
  }
  it('links both articles from the shared home and guide listing', () => {
    const html = renderToStaticMarkup(createElement(LibraryGuideLinks))
    for (const guide of LIBRARY_GUIDES) expect(html).toContain(`href="${guidePath(guide)}"`)
  })
})
