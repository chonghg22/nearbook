import { PgDatabase, PgDialect } from 'drizzle-orm/pg-core'
import { featuredNewArrivalsQuery } from './featured-new-arrivals.query'
import { libraryCurations, sql } from '@nearbook/db'

jest.mock('@nearbook/db', () => {
  const orm = jest.requireActual('drizzle-orm')
  const { pgTable, integer, text, timestamp } = jest.requireActual('drizzle-orm/pg-core')
  return {
    ...orm,
    libraries: pgTable('libraries', { id: integer('id'), name: text('name'), address: text('address'), region: text('region') }),
    libraryCurations: pgTable('library_curations', {
      libraryId: integer('library_id'), section: text('section'), periodKey: text('period_key'), fetchedAt: timestamp('fetched_at'),
    }),
  }
})

describe('featured new arrivals SQL (real Drizzle, no driver or database)', () => {
  const database = new PgDatabase(new PgDialect(), {} as never, undefined)

  it('reproduces the original missing raw SQL alias failure', () => {
    const broken = database.select({ periodKey: sql<string>`max(${libraryCurations.periodKey})` })
      .from(libraryCurations).as('latest_by_library')
    expect(() => broken.periodKey).toThrow(/alias/i)
  })

  it('generates the actual query with latest period joins, ordering and limit', () => {
    const query = featuredNewArrivalsQuery(database as unknown as Parameters<typeof featuredNewArrivalsQuery>[0], 12).toSQL()
    expect(query.sql).toContain('as "latest_period_key"')
    expect(query.sql).toContain('"latest_by_library"')
    expect(query.sql).toContain('"library_curations"."period_key" = "latest_period_key"')
    expect(query.sql).toContain('group by')
    expect(query.sql).toContain('order by count(*)::int desc')
    expect(query.sql).toContain('as "fetched_at"')
    expect(query.params).toEqual(['new_arrivals', 'new_arrivals', 12])
  })
})
