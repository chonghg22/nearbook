import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ directory: vi.fn() }))
vi.mock('@/lib/seo/region-directory-server', () => ({ getRegionDirectory: mocks.directory }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))
import RegionsPage, { generateMetadata as indexMetadata } from './page'
import RegionPage, { generateMetadata } from '../region/[sido]/page'
const entry = {
  slug: 'seoul',
  name: '서울특별시',
  districts: ['중구'],
  libraries: [1, 2, 3].map((id) => ({
    id,
    name: `실제 도서관 ${id}`,
    address: '서울 중구',
    region: '서울특별시 중구',
  })),
}

beforeEach(() => {
  vi.stubEnv('APP_ENV', 'production')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')
  mocks.directory.mockResolvedValue([entry])
})
afterEach(() => vi.unstubAllEnvs())
const props = (sido: string) => ({ params: Promise.resolve({ sido }) })

describe('regional SSR and SEO agree', () => {
  it('renders real library anchors, self canonical, OG, and exactly matching JSON-LD', async () => {
    const html = renderToStaticMarkup(await RegionPage(props('seoul')))
    expect(html).toContain('href="/library/1"')
    expect(html).toContain('href="/regions"')
    const json = JSON.parse(
      html.match(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/)![1]!
    )
    const list = json['@graph'].find((node: any) => node['@type'] === 'ItemList')
    expect(list.numberOfItems).toBe(3)
    expect(list.itemListElement.map((node: any) => node.url)).toEqual(
      entry.libraries.map((row) => `https://www.near-book.com/library/${row.id}`)
    )
    const metadata = await generateMetadata(props('seoul'))
    expect(metadata.alternates?.canonical).toBe('https://www.near-book.com/region/seoul')
    expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical)
    expect(metadata.robots).toMatchObject({ index: true })
    expect(renderToStaticMarkup(await RegionsPage())).toContain('href="/region/seoul"')
  })
  it('noindexes unavailable data and renders recovery, without a synthetic list', async () => {
    mocks.directory.mockResolvedValue(null)
    expect(await generateMetadata(props('seoul'))).toMatchObject({ robots: { index: false } })
    expect(await indexMetadata()).toMatchObject({ robots: { index: false } })
    const html = renderToStaticMarkup(await RegionPage(props('seoul')))
    expect(html).toContain('도서관이 없다는 뜻은 아닙니다')
    expect(html).not.toContain('application/ld+json')
    expect(html).not.toContain('href="/library/')
  })
  it('does not generate nonexistent or underpopulated landings', async () => {
    await expect(RegionPage(props('invented'))).rejects.toThrow('NOT_FOUND')
    await expect(RegionPage(props('busan'))).rejects.toThrow('NOT_FOUND')
    expect(await generateMetadata(props('busan'))).toMatchObject({ robots: { index: false } })
    mocks.directory.mockResolvedValue([])
    expect(await indexMetadata()).toMatchObject({ robots: { index: false } })
  })
  it('keeps preview noindex even if APP_ENV was copied from production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(await generateMetadata(props('seoul'))).toMatchObject({
      robots: { index: false, follow: false },
    })
  })
})
