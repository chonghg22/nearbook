import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildBookJsonLd,
  buildBookListJsonLd,
  buildFaqJsonLd,
  buildHomeJsonLd,
  buildLibraryJsonLd,
} from './json-ld'
import { buildPageMetadata } from './metadata'

const HOME_BREADCRUMB = { name: '홈', path: '/' }

/** @graph의 n번째 노드를 검증용으로 읽는다. */
function node(graph: { '@graph': readonly unknown[] }, index: number): Record<string, any> {
  return graph['@graph'][index] as Record<string, any>
}

describe('JSON-LD 빌더', () => {
  beforeEach(() => {
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.near-book.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('홈은 Organization과 WebSite를 하나의 그래프로 만든다', () => {
    const graph = buildHomeJsonLd()
    const types = graph['@graph'].map((item) => (item as { '@type': string })['@type'])

    expect(types).toEqual(['Organization', 'WebSite'])

    const website = node(graph, 1)
    expect(website.publisher).toEqual({ '@id': 'https://www.near-book.com/#organization' })
    expect(website.potentialAction['query-input']).toBe('required name=search_term_string')
    expect(website.potentialAction.target.urlTemplate).toBe(
      'https://www.near-book.com/search?q={search_term_string}',
    )
  })

  it('책 상세는 Book과 BreadcrumbList를 만든다', () => {
    const graph = buildBookJsonLd({
      book: {
        isbn: '9788936434120',
        title: '소년이 온다',
        author: '한강',
        publisher: '창비',
        publishedYear: '2014',
        coverUrl: 'https://image.example.com/cover.jpg',
      },
      path: '/book/9788936434120',
      breadcrumbs: [HOME_BREADCRUMB, { name: '소년이 온다', path: '/book/9788936434120' }],
    })

    const book = node(graph, 0)
    const breadcrumb = node(graph, 1)

    expect(book['@type']).toBe('Book')
    expect(book.url).toBe('https://www.near-book.com/book/9788936434120')
    expect(book.author).toEqual({ '@type': 'Person', name: '한강' })
    expect(book.datePublished).toBe('2014')
    expect(breadcrumb['@type']).toBe('BreadcrumbList')
    expect(breadcrumb.itemListElement).toHaveLength(2)
    expect(breadcrumb.itemListElement[1].item).toBe(
      'https://www.near-book.com/book/9788936434120',
    )
  })

  it('책 표지가 없으면 image를 넣지 않는다', () => {
    const graph = buildBookJsonLd({
      book: { isbn: '9788936434120', title: '소년이 온다', coverUrl: null, author: '   ' },
      path: '/book/9788936434120',
      breadcrumbs: [HOME_BREADCRUMB],
    })

    const book = node(graph, 0)

    expect(book).not.toHaveProperty('image')
    expect(book).not.toHaveProperty('author')
  })

  it('도서관 상세는 Library와 주소·좌표를 만들고 없는 값은 제외한다', () => {
    const graph = buildLibraryJsonLd({
      library: {
        id: 111003,
        name: '노원구립도서관',
        address: '서울특별시 노원구 동일로 1405',
        region: '서울특별시 노원구',
        phone: null,
        homepage: 'https://www.nowonlib.kr/',
        lat: 37.65,
        lng: 127.06,
        operatingHours: { text: '평일 09:00 ~ 18:00' },
      },
      path: '/library/111003',
      breadcrumbs: [HOME_BREADCRUMB, { name: '노원구립도서관', path: '/library/111003' }],
    })

    const library = node(graph, 0)

    expect(library['@type']).toBe('Library')
    expect(library).not.toHaveProperty('telephone')
    expect(library.sameAs).toBe('https://www.nowonlib.kr/')
    expect(library.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '서울특별시 노원구 동일로 1405',
      addressLocality: '서울특별시 노원구',
      addressCountry: 'KR',
    })
    expect(library.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 37.65,
      longitude: 127.06,
    })
  })

  it('도서관 좌표가 없으면 geo를 넣지 않는다', () => {
    const graph = buildLibraryJsonLd({
      library: { id: 1, name: '도서관', lat: null, lng: null },
      path: '/library/1',
      breadcrumbs: [HOME_BREADCRUMB],
    })

    expect(node(graph, 0)).not.toHaveProperty('geo')
  })

  it('목록은 CollectionPage와 ItemList를 만들고 ISBN 없는 항목은 제외한다', () => {
    const graph = buildBookListJsonLd({
      path: '/popular',
      name: '도서관 인기 대출 도서',
      description: '설명',
      books: [
        { isbn: '9788936434120', title: '소년이 온다' },
        { isbn: '', title: 'ISBN 없는 책' },
        { isbn: '9788932473574', title: '' },
      ],
      breadcrumbs: [HOME_BREADCRUMB, { name: '인기 대출 도서', path: '/popular' }],
    })

    const collectionPage = node(graph, 0)
    const itemList = node(graph, 1)

    expect(collectionPage['@type']).toBe('CollectionPage')
    expect(collectionPage.mainEntity).toEqual({ '@id': 'https://www.near-book.com/popular#book-list' })
    expect(itemList.numberOfItems).toBe(1)
    expect(itemList.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: '소년이 온다',
        url: 'https://www.near-book.com/book/9788936434120',
      },
    ])
  })

  it('목록이 비어 있으면 numberOfItems가 0이고 항목은 빈 배열이다', () => {
    const graph = buildBookListJsonLd({
      path: '/rising',
      name: '대출 급상승 도서',
      description: '설명',
      books: [],
      breadcrumbs: [HOME_BREADCRUMB],
    })

    const itemList = node(graph, 1)

    expect(itemList.numberOfItems).toBe(0)
    expect(itemList.itemListElement).toEqual([])
  })

  it('Q&A는 화면 항목 수와 같은 FAQPage를 만든다', () => {
    const items = [
      { question: '질문1', answer: '답변1' },
      { question: '질문2', answer: '답변2' },
    ]
    const graph = buildFaqJsonLd({ path: '/qna', items })
    const faq = node(graph, 0)

    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(items.length)
    expect(faq.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: '질문1',
      acceptedAnswer: { '@type': 'Answer', text: '답변1' },
    })
  })

  it('JSON-LD URL과 metadata canonical이 같은 값이다', () => {
    const path = '/library/111003'
    const metadata = buildPageMetadata({ path, title: '노원구립도서관' })
    const graph = buildLibraryJsonLd({
      library: { id: 111003, name: '노원구립도서관' },
      path,
      breadcrumbs: [HOME_BREADCRUMB],
    })

    expect(node(graph, 0).url).toBe(metadata.alternates?.canonical)
  })
})
