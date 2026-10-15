import { Logger } from '@nestjs/common'
import { db } from '@nearbook/db'
import { OramaIndexService } from './orama-index.service'
import { bookMatchRank } from './search-ranking'
import {
  authorNames,
  normalizeSearchIsbn,
  normalizeSearchText,
  resolveSearchInput,
  searchEditionLabels,
} from '@nearbook/shared-types'

jest.mock('@nearbook/db', () => ({ db: { select: jest.fn() }, bookCache: {} }))

const titles = [
  '소년이 온다',
  '채식주의자',
  '작별하지 않는다',
  '불편한 편의점',
  '아몬드',
  '82년생 김지영',
  '나미야 잡화점의 기적',
  '미움받을 용기',
  '세이노의 가르침',
  '데미안',
  '어린 왕자',
  '이기적 유전자',
  '사피엔스',
  '총 균 쇠',
  '역사의 쓸모',
  '돈의 심리학',
  '트렌드 코리아',
  '달러구트 꿈 백화점',
  '파친코',
  '모순',
  '나는 나로 살기로 했다',
  '오만과 편견',
  '인간 실격',
  '동물 농장',
  '멋진 신세계',
  '정의란 무엇인가',
  '코스모스',
  '수학이 필요한 순간',
  'The Hobbit',
  'Atomic Habits',
]
const isbnFor = (id: number) => {
  const prefix = '978' + String(id).padStart(9, '0')
  const sum = [...prefix].reduce((n, digit, i) => n + Number(digit) * (i % 2 ? 3 : 1), 0)
  return prefix + String((10 - (sum % 10)) % 10)
}
const book = (id: number, title: string, extra = {}) => ({
  isbn: isbnFor(id),
  title,
  author: '테스트 저자',
  publisher: '테스트 출판',
  popularityScore: 0,
  publishedYear: 2000,
  ...extra,
})
const rows = titles.flatMap((title, i) => [
  book(i * 3 + 1, title),
  book(i * 3 + 2, `${title} : 작품 소개`, { popularityScore: 100, publishedYear: 2025 }),
  book(i * 3 + 3, `${title.split(' ')[0]}의 다른 이야기`, {
    popularityScore: 1000,
    publishedYear: 2030,
  }),
])
const authors = ['한강', '김호연', '손원평', '김영하', '베르나르 베르베르']
const publishers = ['창비', '문학동네', '민음사']
const extras = [
  ...authors.map((author, i) => book(200 + i, `저자 작품 ${i}`, { author: `지은이: ${author}` })),
  ...authors.map((author, i) => book(210 + i, `${author} 연구`, { author: '다른 사람' })),
  ...publishers.map((publisher, i) => book(230 + i, `출판사 도서 ${i}`, { publisher })),
  ...publishers.map((publisher, i) =>
    book(240 + i, `${publisher} 연구`, { publisher: '다른 출판사' })
  ),
  book(300, '소년이 온다 [큰글자책]', { popularityScore: 10000 }),
  book(301, '소년이 온다 필사책', { popularityScore: 10000 }),
  book(302, '독립 판본', { isbn: '9788936434120' }),
  book(303, 'ISBN-10 이전 색인', { isbn: '080442957X' }),
]

describe('40 representative queries against the real Orama index', () => {
  let service: OramaIndexService
  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    ;(db.select as jest.Mock).mockImplementation(() => ({
      from: () => ({
        limit: () => ({
          offset: (offset: number) => Promise.resolve(offset === 0 ? [...rows, ...extras] : []),
        }),
      }),
    }))
    service = new OramaIndexService()
    jest.spyOn(service, 'persist').mockResolvedValue(undefined) // Never touch disk/production index.
    await service.fullRebuild()
  })
  afterAll(() => jest.restoreAllMocks())

  it.each(titles.map((q, i) => ({ q, isbn: isbnFor(i * 3 + 1) })))(
    'title: $q exact match first',
    async ({ q, isbn }) => {
      const result = await service.query({ q, searchType: 'title', limit: 1, offset: 0 })
      expect(result.hits[0]).toMatchObject({ isbn })
    }
  )
  it.each(authors.map((q, i) => ({ q, isbn: isbnFor(200 + i), excluded: isbnFor(210 + i) })))(
    'author: $q uses author field',
    async ({ q, isbn, excluded }) => {
      const result = await service.query({ q, searchType: 'author', limit: 50, offset: 0 })
      expect(result.hits[0]).toMatchObject({ isbn })
      expect(result.hits.map((r) => r.isbn)).not.toContain(excluded)
    }
  )
  it.each(publishers.map((q, i) => ({ q, isbn: isbnFor(230 + i), excluded: isbnFor(240 + i) })))(
    'publisher: $q uses publisher field',
    async ({ q, isbn, excluded }) => {
      const result = await service.query({ q, searchType: 'publisher', limit: 50, offset: 0 })
      expect(result.hits[0]).toMatchObject({ isbn })
      expect(result.hits.map((r) => r.isbn)).not.toContain(excluded)
    }
  )
  it.each(['978-89-364-3412-0', '8936434128'])(
    'ISBN %s finds exactly the canonical ISBN-13',
    async (q) => {
      const result = await service.query({ q, limit: 10, offset: 0 })
      expect(result.total).toBe(1)
      expect(result.hits[0]).toMatchObject({ isbn: '9788936434120' })
    }
  )

  it('ranks all candidates before pagination, not just a returned page', async () => {
    const whole = await service.query({
      q: '소년이 온다',
      searchType: 'title',
      limit: 30,
      offset: 0,
    })
    const second = await service.query({
      q: '소년이 온다',
      searchType: 'title',
      limit: 1,
      offset: 1,
    })
    expect(second.hits[0]).toEqual(whole.hits[1])
    expect(second.hits[0]).toMatchObject({ isbn: isbnFor(2) })
    const phrase = whole.hits.findIndex((r) => r.isbn === isbnFor(2))
    const partial = whole.hits.findIndex((r) => r.isbn === isbnFor(3))
    expect(partial).toBeGreaterThan(phrase)
    expect(whole.hits.findIndex((r) => r.isbn === isbnFor(300))).toBeGreaterThan(phrase)
  })
  it('normalizes case, Unicode width, punctuation and whitespace for relevance', async () => {
    expect(
      (
        await service.query({
          q: '  ＴＨＥ   ＨＯＢＢＩＴ! ',
          searchType: 'title',
          limit: 1,
          offset: 0,
        })
      ).hits[0]
    ).toMatchObject({ title: 'The Hobbit' })
    expect(bookMatchRank(book(1, '소년이 온다'), '소년이온다!', 'title')).toBe(0)
  })
  it('all retains discovery by author, while title cannot match only author', async () => {
    const authorId = isbnFor(200)
    expect(
      (await service.query({ q: '한강', searchType: 'all', limit: 50, offset: 0 })).hits.map(
        (r) => r.isbn
      )
    ).toContain(authorId)
    expect(
      (await service.query({ q: '한강', searchType: 'title', limit: 50, offset: 0 })).hits.map(
        (r) => r.isbn
      )
    ).not.toContain(authorId)
  })
  it('explicit popular/recent ordering is not silently replaced by relevance', async () => {
    const popular = await service.query({
      q: '소년이 온다',
      searchType: 'title',
      sort: 'popular',
      limit: 1,
      offset: 0,
    })
    expect([isbnFor(300), isbnFor(301)]).toContain(popular.hits[0]?.isbn)
    const recent = await service.query({
      q: '소년이 온다',
      searchType: 'title',
      sort: 'recent',
      limit: 1,
      offset: 0,
    })
    expect(recent.hits[0]).toMatchObject({ isbn: isbnFor(3) })
  })
  it('an explicit edition query can find that edition without being downgraded', async () => {
    const result = await service.query({
      q: '소년이 온다 큰글자책',
      searchType: 'title',
      limit: 1,
      offset: 0,
    })
    expect(result.hits[0]).toMatchObject({ isbn: isbnFor(300) })
  })
  it('queries legacy ISBN-10 records through the canonical ISBN-13 alias without an index migration', async () => {
    const result = await service.query({
      q: '9780804429573',
      searchType: 'isbn',
      limit: 10,
      offset: 0,
    })
    expect(result.total).toBe(1)
    expect(result.hits[0]).toMatchObject({ isbn: '080442957X' })
  })
  it('tracks real index upserts and rebuilds so service caches can invalidate', async () => {
    const before = service.revision
    await service.upsertMany([])
    expect(service.revision).toBe(before)
    await service.upsertOne(book(901, '새로 색인된 책'))
    expect(service.revision).toBeGreaterThan(before)
    const one = service.revision
    await service.upsertMany([book(902, '두 번째 색인된 책')])
    expect(service.revision).toBeGreaterThan(one)
    const many = service.revision
    await service.fullRebuild()
    expect(service.revision).toBeGreaterThan(many)
  })
})

describe('query and edition semantics', () => {
  it.each([
    '9788936434121',
    '1234567890123',
    '978893643412',
    '8936434129',
    'book 9788936434120',
    '',
  ])('rejects invalid ISBN %s', (q) => {
    expect(normalizeSearchIsbn(q)).toBeNull()
    expect(resolveSearchInput(q, 'isbn').invalidIsbn).toBe(true)
  })
  it('supports ISBN-10 X checksum and does not auto-switch explicit author/publisher searches', () => {
    expect(normalizeSearchIsbn('0-8044-2957-x')).toBe('9780804429573')
    expect(resolveSearchInput('9788936434120', 'publisher').searchType).toBe('publisher')
    expect(resolveSearchInput('9788936434120', 'author').searchType).toBe('author')
    expect(resolveSearchInput('ISBN-13: 9788936434120', 'title')).toMatchObject({
      q: '9788936434120',
      searchType: 'isbn',
    })
  })
  it('normalizes recognized contributor syntax without deleting names/other parentheses', () => {
    expect(authorNames('지은이: 한강; 김영하 (지은이); 박지민 (옮긴이)')).toBe(
      '한강; 김영하; 박지민'
    )
    expect(authorNames('김작가 (본명)')).toBe('김작가 (본명)')
    expect(normalizeSearchText(authorNames('한강 (지은이)'))).toBe('한강')
  })
  it('labels only title evidence and does not invent a regular edition', () => {
    expect(searchEditionLabels('소년이 온다 [큰글자책]')).toEqual(['큰글자 표기'])
    expect(searchEditionLabels('소년이 온다 필사책')).toEqual(['필사 표기'])
    expect(searchEditionLabels('필사의 힘')).toEqual([])
    expect(searchEditionLabels('소년이 온다')).toEqual([])
  })
})
