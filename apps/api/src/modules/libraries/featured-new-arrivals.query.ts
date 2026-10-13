import { and, asc, desc, eq, libraries, libraryCurations, sql } from '@nearbook/db'
import type { Database } from '@nearbook/db'

// SQL generation can be tested without a database connection.
export function featuredNewArrivalsQuery(database: Pick<Database, 'select'>, limit = 12) {
  const latest = database.select({
    libraryId: libraryCurations.libraryId,
    // A unique alias also avoids ambiguity with library_curations.period_key.
    periodKey: sql<string>`max(${libraryCurations.periodKey})`.as('latest_period_key'),
  }).from(libraryCurations)
    .where(eq(libraryCurations.section, 'new_arrivals'))
    .groupBy(libraryCurations.libraryId).as('latest_by_library')

  return database.select({
    id: libraries.id, name: libraries.name, address: libraries.address, region: libraries.region,
    periodKey: latest.periodKey,
    bookCount: sql<number>`count(*)::int`,
    fetchedAt: sql<Date>`max(${libraryCurations.fetchedAt})`.mapWith(libraryCurations.fetchedAt).as('fetched_at'),
  }).from(libraryCurations)
    .innerJoin(latest, and(eq(libraryCurations.libraryId, latest.libraryId), eq(libraryCurations.periodKey, latest.periodKey)))
    .innerJoin(libraries, eq(libraryCurations.libraryId, libraries.id))
    .where(eq(libraryCurations.section, 'new_arrivals'))
    .groupBy(libraries.id, libraries.name, libraries.address, libraries.region, latest.periodKey)
    .orderBy(desc(sql<number>`count(*)::int`), asc(libraries.id))
    .limit(limit)
}
