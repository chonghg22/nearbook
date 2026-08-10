import type {
  Book,
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  Graph,
  ItemList,
  Library,
  ListItem,
  Organization,
  Question,
  SearchActionLeaf,
  WebSite,
  WithActionConstraints,
} from 'schema-dts'
import { compactJsonLd } from './json-ld-serialize'
import { SITE_DESCRIPTION, SITE_NAME } from './metadata'
import { getSiteOrigin, toAbsoluteSiteUrl } from './site-url'

export type BreadcrumbItem = {
  name: string
  path: string
}

export type JsonLdBook = {
  isbn?: string | null
  title?: string | null
  author?: string | null
  publisher?: string | null
  publishedYear?: string | number | null
  coverUrl?: string | null
  summary?: string | null
}

export type JsonLdLibrary = {
  id: number | string
  name?: string | null
  address?: string | null
  region?: string | null
  phone?: string | null
  homepage?: string | null
  lat?: number | null
  lng?: number | null
  operatingHours?: { text?: string | null; closed?: string | null } | null
}

function text(value: unknown) {
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function buildBreadcrumbList(pagePath: string, items: BreadcrumbItem[]): BreadcrumbList {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${toAbsoluteSiteUrl(pagePath)}#breadcrumb`,
    itemListElement: items.map(
      (item, index): ListItem => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: toAbsoluteSiteUrl(item.path),
      }),
    ),
  }
}

export function buildHomeJsonLd(): Graph {
  const origin = getSiteOrigin()

  const organization: Organization = {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: SITE_NAME,
    url: `${origin}/`,
  }

  const searchAction: WithActionConstraints<SearchActionLeaf> = {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${origin}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  }

  const website: WebSite = {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: `${origin}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'ko-KR',
    publisher: { '@id': `${origin}/#organization` },
    potentialAction: searchAction,
  }

  return { '@context': 'https://schema.org', '@graph': [organization, website] }
}

export function buildBookJsonLd({
  book,
  path,
  breadcrumbs,
}: {
  book: JsonLdBook
  path: string
  breadcrumbs: BreadcrumbItem[]
}): Graph {
  const pageUrl = toAbsoluteSiteUrl(path)
  const author = text(book.author)

  const entity = compactJsonLd({
    '@type': 'Book',
    '@id': `${pageUrl}#book`,
    url: pageUrl,
    name: text(book.title),
    isbn: text(book.isbn),
    publisher: text(book.publisher),
    datePublished: text(book.publishedYear),
    image: text(book.coverUrl),
    description: text(book.summary),
    inLanguage: 'ko',
    ...(author ? { author: { '@type': 'Person' as const, name: author } } : {}),
  }) as Book

  return {
    '@context': 'https://schema.org',
    '@graph': [entity, buildBreadcrumbList(path, breadcrumbs)],
  }
}

export function buildLibraryJsonLd({
  library,
  path,
  breadcrumbs,
}: {
  library: JsonLdLibrary
  path: string
  breadcrumbs: BreadcrumbItem[]
}): Graph {
  const pageUrl = toAbsoluteSiteUrl(path)
  const address = text(library.address)
  const region = text(library.region)
  const hasGeo = typeof library.lat === 'number' && typeof library.lng === 'number'

  const entity = compactJsonLd({
    '@type': 'Library',
    '@id': `${pageUrl}#library`,
    url: pageUrl,
    name: text(library.name),
    telephone: text(library.phone),
    // 도서관 공식 홈페이지는 별도 사이트이므로 url이 아닌 sameAs로 표기한다.
    sameAs: text(library.homepage),
    openingHours: text(library.operatingHours?.text),
    ...(address
      ? {
          address: compactJsonLd({
            '@type': 'PostalAddress' as const,
            streetAddress: address,
            addressLocality: region,
            addressCountry: 'KR',
          }),
        }
      : {}),
    ...(hasGeo
      ? {
          geo: {
            '@type': 'GeoCoordinates' as const,
            latitude: library.lat as number,
            longitude: library.lng as number,
          },
        }
      : {}),
  }) as Library

  return {
    '@context': 'https://schema.org',
    '@graph': [entity, buildBreadcrumbList(path, breadcrumbs)],
  }
}

export function buildBookListJsonLd({
  path,
  name,
  description,
  books,
  breadcrumbs,
}: {
  path: string
  name: string
  description: string
  books: JsonLdBook[]
  breadcrumbs: BreadcrumbItem[]
}): Graph {
  const pageUrl = toAbsoluteSiteUrl(path)
  // ISBN과 제목이 모두 있어야 상세 페이지 URL을 만들 수 있다.
  const validBooks = books.filter((book) => text(book.isbn) && text(book.title))

  const collectionPage: CollectionPage = {
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name,
    description,
    inLanguage: 'ko-KR',
    isPartOf: { '@id': `${getSiteOrigin()}/#website` },
    breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
    mainEntity: { '@id': `${pageUrl}#book-list` },
  }

  const itemList: ItemList = {
    '@type': 'ItemList',
    '@id': `${pageUrl}#book-list`,
    numberOfItems: validBooks.length,
    itemListElement: validBooks.map(
      (book, index): ListItem => ({
        '@type': 'ListItem',
        position: index + 1,
        name: text(book.title) as string,
        url: toAbsoluteSiteUrl(`/book/${text(book.isbn)}`),
      }),
    ),
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [collectionPage, itemList, buildBreadcrumbList(path, breadcrumbs)],
  }
}

export function buildFaqJsonLd({
  path,
  items,
}: {
  path: string
  items: { question: string; answer: string }[]
}): Graph {
  const pageUrl = toAbsoluteSiteUrl(path)

  const faqPage: FAQPage = {
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    url: pageUrl,
    inLanguage: 'ko-KR',
    mainEntity: items.map(
      (item): Question => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      }),
    ),
  }

  return { '@context': 'https://schema.org', '@graph': [faqPage] }
}
