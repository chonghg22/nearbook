import { db } from '@nearbook/db'
import { LibraryCardsService } from '../library-cards/library-cards.service'
import { WishlistsService } from './wishlists.service'
import { WishlistsController } from './wishlists.controller'
import { observeHolding } from '../libraries/holding-observation'
import { AuthGuard } from '../auth/auth.guard'
import { GUARDS_METADATA, HEADERS_METADATA } from '@nestjs/common/constants'

// This harness checks query ownership/order/transaction rollback propagation, not a live DB.
jest.mock('@nearbook/db', () => {
  const mock = {
    reads: [] as unknown[][],
    returning: [] as Array<unknown[] | Error>,
    events: [] as any[],
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  }
  const table = (name: string) =>
    Object.fromEntries(
      [
        'id',
        'supabaseUserId',
        'userId',
        'libraryId',
        'isbn',
        'isDefault',
        'name',
        'address',
        'lat',
        'lng',
        'homepage',
        'nickname',
        'createdAt',
        'addedAt',
        'note',
        'title',
        'author',
        'coverUrl',
      ].map((column) => [column, `${name}.${column}`])
    )
  const builder = (kind: string, source?: unknown) => {
    const event: any = { kind, table: source }
    mock.events.push(event)
    const value: any = {
      from: (source: unknown) => {
        event.table = source
        return value
      },
      innerJoin: () => value,
      leftJoin: () => value,
      limit: () => value,
      orderBy: () => value,
      where: (condition: unknown) => {
        event.where = condition
        return value
      },
      for: (mode: string) => {
        event.lock = mode
        return value
      },
      values: (fields: unknown) => {
        event.fields = fields
        return value
      },
      set: (fields: unknown) => {
        event.fields = fields
        return value
      },
      onConflictDoNothing: (target: unknown) => {
        event.conflict = target
        return value
      },
      returning: async () => {
        const result = mock.returning.shift() ?? []
        if (result instanceof Error) throw result
        return result
      },
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve(kind === 'select' ? (mock.reads.shift() ?? []) : []).then(resolve, reject),
    }
    return value
  }
  mock.select.mockImplementation(() => builder('select'))
  mock.insert.mockImplementation((source) => builder('insert', source))
  mock.update.mockImplementation((source) => builder('update', source))
  mock.delete.mockImplementation((source) => builder('delete', source))
  mock.transaction.mockImplementation(async (run) => {
    mock.events.push({ kind: 'begin' })
    try {
      const result = await run(mock)
      mock.events.push({ kind: 'commit' })
      return result
    } catch (error) {
      mock.events.push({ kind: 'rollback' })
      throw error
    }
  })
  return {
    db: mock,
    users: table('users'),
    wishlists: table('wishlists'),
    libraryCards: table('cards'),
    libraries: table('libraries'),
    bookCache: table('books'),
    eq: (a: unknown, b: unknown) => ({ eq: [a, b] }),
    and: (...values: unknown[]) => ({ and: values }),
    count: () => 'count',
    desc: () => 'desc',
    asc: () => 'asc',
  }
})
const mock = db as unknown as {
  reads: any[][]
  returning: Array<any[] | Error>
  events: any[]
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  transaction: jest.Mock
}
const isbn = '9788936434120'
const user = { id: 42, plan: 'free' }
const card = { id: 7, libraryId: 111314, userId: 42, isDefault: true }
const library = {
  id: 111314,
  name: '서울도서관',
  homepage: 'https://lib.seoul.go.kr/',
  lat: 37.56,
  lng: 126.97,
}
const upstream = { getBookOwnership: jest.fn() }
let cards: LibraryCardsService
let wishes: WishlistsService
beforeEach(() => {
  mock.reads = []
  mock.returning = []
  mock.events = []
  for (const value of [
    mock.select,
    mock.insert,
    mock.update,
    mock.delete,
    mock.transaction,
    upstream.getBookOwnership,
  ])
    value.mockClear()
  upstream.getBookOwnership.mockReset()
  cards = new LibraryCardsService()
  wishes = new WishlistsService(upstream as never)
})
it('rejects an unowned/default target before clearing any existing default', async () => {
  mock.reads = [[user], []]
  await expect(cards.update('owner', 999, { isDefault: true })).rejects.toThrow()
  expect(mock.update).not.toHaveBeenCalled()
  expect(mock.events.find((event) => event.table?.id === 'users.id')?.lock).toBe('update')
  expect(mock.events.find((event) => event.table?.id === 'cards.id')?.where).toEqual({
    and: [{ eq: ['cards.id', 999] }, { eq: ['cards.userId', 42] }],
  })
  expect(mock.events.at(-1).kind).toBe('rollback')
})
it('clears and sets defaults atomically under a user row lock, without clearing nickname', async () => {
  mock.reads = [[user], [card]]
  mock.returning = [[card]]
  expect((await cards.update('owner', 7, { isDefault: true })).data).toBe(card)
  const updates = mock.events.filter((event) => event.kind === 'update')
  expect(updates.map((event) => event.fields)).toEqual([{ isDefault: false }, { isDefault: true }])
  expect(updates[0].where).toEqual({ eq: ['cards.userId', 42] })
  expect(mock.events.at(-1).kind).toBe('commit')
})
it('a failure after default clearing propagates out of the transaction for rollback', async () => {
  mock.reads = [[user], [card]]
  mock.returning = [new Error('write failed')]
  await expect(cards.update('owner', 7, { isDefault: true })).rejects.toThrow('write failed')
  expect(mock.events.at(-1).kind).toBe('rollback')
  expect(mock.events.some((event) => event.kind === 'commit')).toBe(false)
})
it('nickname-only update never touches the default flag', async () => {
  mock.reads = [[user], [card]]
  mock.returning = [[{ ...card, nickname: '내 도서관' }]]
  await cards.update('owner', 7, { nickname: '내 도서관' })
  expect(mock.update).toHaveBeenCalledTimes(1)
  expect(mock.events.find((event) => event.kind === 'update').fields).toEqual({
    nickname: '내 도서관',
  })
})
it('empty settings updates are read-only and malformed default values fail before clearing', async () => {
  mock.reads = [[user], [card]]
  expect((await cards.update('owner', 7, {})).data).toBe(card)
  expect(mock.update).not.toHaveBeenCalled()
  await expect(cards.update('owner', 7, { isDefault: null } as never)).rejects.toMatchObject({
    status: 400,
  })
  expect(mock.update).not.toHaveBeenCalled()
})
it('idempotent library re-add succeeds even at the unchanged one-library free limit', async () => {
  mock.reads = [[user], [card]]
  expect((await cards.add('owner', { libraryId: 111314 })).data).toBe(card)
  expect(
    mock.events.filter((event) => event.kind === 'insert' && event.table?.id === 'cards.id')
  ).toHaveLength(0)
})
it('a different library cannot bypass the free limit', async () => {
  mock.reads = [[user], [card]]
  await expect(cards.add('owner', { libraryId: 111315 })).rejects.toMatchObject({ status: 403 })
})
it('validates the library exists before insertion and marks only the first registration default', async () => {
  mock.reads = [[user], [], [library]]
  mock.returning = [[card]]
  await cards.add('owner', { libraryId: 111314 })
  expect(
    mock.events.find((event) => event.kind === 'insert' && event.table?.id === 'cards.id').fields
  ).toMatchObject({ userId: 42, libraryId: 111314, isDefault: true })
})
it('nonexistent library rolls back without inserting a card', async () => {
  mock.reads = [[user], [], []]
  await expect(cards.add('owner', { libraryId: 999 })).rejects.toMatchObject({ status: 404 })
  expect(
    mock.events.some((event) => event.kind === 'insert' && event.table?.id === 'cards.id')
  ).toBe(false)
})
it('deleting a default is scoped and never auto-promotes another library', async () => {
  mock.reads = [[user]]
  await cards.remove('owner', 7)
  expect(mock.events.find((event) => event.kind === 'delete').where).toEqual({
    and: [{ eq: ['cards.id', 7] }, { eq: ['cards.userId', 42] }],
  })
  expect(mock.update).not.toHaveBeenCalled()
})
it('wishlist re-add is idempotent before checking the ten-book limit', async () => {
  const item = { id: 1, userId: 42, isbn }
  mock.reads = [[user], [item]]
  expect((await wishes.add('owner', undefined, { isbn })).data).toBe(item)
  expect(mock.select).toHaveBeenCalledTimes(2)
  expect(
    mock.events.filter((event) => event.kind === 'insert' && event.table?.id === 'wishlists.id')
  ).toHaveLength(0)
})
it('new wishlist entries still enforce free ten-book cap under the same user lock', async () => {
  mock.reads = [[user], [], [{ value: 10 }]]
  await expect(wishes.add('owner', undefined, { isbn })).rejects.toMatchObject({ status: 403 })
  expect(mock.events.filter((event) => event.lock === 'update')).toHaveLength(1)
})
it('new successful wishlist entry does not mutate existing email/plan or enable notifications', async () => {
  mock.reads = [[user], [], [{ value: 9 }]]
  mock.returning = [[{ isbn }]]
  await wishes.add('owner', 'owner@example.test', { isbn })
  expect(
    mock.events.find((event) => event.kind === 'insert' && event.table?.id === 'users.id').conflict
  ).toEqual({ target: 'users.supabaseUserId' })
  expect(mock.update).not.toHaveBeenCalled()
  expect(mock.events.at(-1).kind).toBe('commit')
})
it('delete by ISBN is scoped to the authenticated user under a lock', async () => {
  mock.reads = [[user]]
  await wishes.remove('owner', isbn)
  expect(mock.events.find((event) => event.kind === 'delete').where).toEqual({
    and: [{ eq: ['wishlists.userId', 42] }, { eq: ['wishlists.isbn', isbn] }],
  })
})
it.each([{ users: [] }, { users: [user] }])(
  'private holdings require both an existing user and an owned wishlist item %#',
  async ({ users }) => {
    mock.reads = [users, []]
    await expect(wishes.getDefaultHolding('owner', isbn, 111314)).rejects.toMatchObject({
      status: 404,
    })
    expect(upstream.getBookOwnership).not.toHaveBeenCalled()
  }
)
it.each([
  { libraries: [] },
  { libraries: [library, { ...library, id: 111315 }] },
  { libraries: [{ ...library, id: 111315 }] },
])('missing/ambiguous/changed defaults do not trigger provider calls %#', async ({ libraries }) => {
  mock.reads = [[user], [{ id: 1 }], libraries]
  await expect(wishes.getDefaultHolding('owner', isbn, 111314)).rejects.toMatchObject({
    status: 409,
  })
  expect(upstream.getBookOwnership).not.toHaveBeenCalled()
})
it('checks one exact owned default library, then revalidates ownership/selection before returning', async () => {
  mock.reads = [[user], [{ id: 1 }], [library], [{ id: 1 }], [library]]
  upstream.getBookOwnership.mockResolvedValue({
    availability: observeHolding({ response: { result: { hasBook: 'Y', loanAvailable: 'Y' } } }),
  })
  const result = await wishes.getDefaultHolding('owner', isbn, 111314)
  expect(upstream.getBookOwnership).toHaveBeenCalledTimes(1)
  expect(upstream.getBookOwnership).toHaveBeenCalledWith(isbn, '111314')
  expect(result.libraries).toHaveLength(1)
  expect(result.libraries[0]).not.toHaveProperty('distanceKm')
  expect(result.holdings).toMatchObject({
    nearbyCount: 1,
    attemptedCount: 1,
    availableCount: 1,
    limited: false,
  })
  expect(
    mock.events
      .filter((event) => event.table?.id === 'cards.id')
      .every((event) => JSON.stringify(event.where).includes('cards.userId'))
  ).toBe(true)
})
it('provider failure stays an unknown state rather than false absence, with no second external request', async () => {
  mock.reads = [[user], [{ id: 1 }], [library], [{ id: 1 }], [library]]
  upstream.getBookOwnership.mockRejectedValue(new Error('API_LIMIT_EXCEEDED'))
  const result = await wishes.getDefaultHolding('owner', isbn, 111314)
  expect(result.libraries[0]).toMatchObject({
    status: 'unknown',
    hasBook: null,
    loanAvailable: null,
    reason: 'quota',
  })
  expect(upstream.getBookOwnership).toHaveBeenCalledTimes(1)
})
it('a default changed during provider work prevents the old result from being returned', async () => {
  mock.reads = [[user], [{ id: 1 }], [library], [{ id: 1 }], [{ ...library, id: 111315 }]]
  upstream.getBookOwnership.mockResolvedValue({
    availability: observeHolding({ response: { result: { hasBook: 'Y', loanAvailable: 'Y' } } }),
  })
  await expect(wishes.getDefaultHolding('owner', isbn, 111314)).rejects.toMatchObject({
    status: 409,
  })
})
it('private holdings is guarded/no-store, and bad selectors stop before service work', () => {
  expect(Reflect.getMetadata(GUARDS_METADATA, WishlistsController)).toContain(AuthGuard)
  expect(
    Reflect.getMetadata(HEADERS_METADATA, WishlistsController.prototype.getDefaultHolding)
  ).toContainEqual({ name: 'Cache-Control', value: 'private, no-store' })
  const service = { getDefaultHolding: jest.fn() }
  const controller = new WishlistsController(service as never)
  expect(() =>
    controller.getDefaultHolding({ user: { supabaseUserId: 'owner' } }, 'bad', 111314)
  ).toThrow()
  expect(() =>
    controller.getDefaultHolding({ user: { supabaseUserId: 'owner' } }, isbn, -1)
  ).toThrow()
  expect(service.getDefaultHolding).not.toHaveBeenCalled()
})
it('the real auth guard rejects anonymous requests before any private provider work', async () => {
  const verifier = { verifyAccessToken: jest.fn() }
  const guard = new AuthGuard(verifier as never)
  const context = { switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) }
  await expect(guard.canActivate(context as never)).rejects.toMatchObject({ status: 401 })
  expect(verifier.verifyAccessToken).not.toHaveBeenCalled()
  expect(upstream.getBookOwnership).not.toHaveBeenCalled()
})
it('invalid bearer identities cannot select another user by request data', async () => {
  const verifier = { verifyAccessToken: jest.fn().mockResolvedValue(null) }
  const guard = new AuthGuard(verifier as never)
  const request = {
    headers: { authorization: 'Bearer fake-test-token' },
    user: { supabaseUserId: 'other' },
  }
  await expect(
    guard.canActivate({ switchToHttp: () => ({ getRequest: () => request }) } as never)
  ).rejects.toMatchObject({ status: 401 })
  expect(upstream.getBookOwnership).not.toHaveBeenCalled()
})
