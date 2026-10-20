// Explicit isolated local database only; creates a transaction-local temporary table.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../packages/db/package.json', import.meta.url))
const postgres = require('postgres')
const url = new URL(process.env.ANALYTICS_TEST_DATABASE_URL ?? 'http://missing')
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !url.pathname.endsWith('_test'))
  throw new Error('Set ANALYTICS_TEST_DATABASE_URL to an isolated localhost *_test database')
const sql = postgres(url.href, { max: 1 })
const statements = (
  await readFile(new URL('../docs/analytics-weekly.sql', import.meta.url), 'utf8')
)
  .split(/(?=^-- \d+\. )/m)
  .filter((part) => /^-- \d+\. /.test(part))
  .map((part) => part.replaceAll('nearbook.events', 'pg_temp.events'))
assert.equal(statements.length, 6)
const base = Date.now() - 3600000
try {
  await sql.begin(async (tx) => {
    await tx`set local timezone = 'UTC'`
    await tx`create temporary table events (id serial, type varchar(32), payload jsonb,
      session_id varchar(64), created_at timestamp not null) on commit drop`
    const add = (session, type, second, payload = {}, epoch = base) => tx`insert into pg_temp.events
      (type, payload, session_id, created_at) values (${type},
      ${tx.json({ schemaVersion: 2, trafficSource: 'fixture', ...payload })},
      ${session}, ${new Date(epoch + second * 1000)})`
    const flow = async (
      session,
      {
        reverse = false,
        unknown = false,
        mismatch = false,
        retry = false,
        laterBook = false,
        reordered = false,
      } = {}
    ) => {
      const rows = [
        ['visit', {}],
        ['search_submit', { query: 'book' }],
        ['book_result_click', { query: 'book', isbn: 'B' }],
        ['book_detail_view', { isbn: 'B' }],
        [
          'holdings_request_completed',
          {
            isbn: 'B',
            requestId: 'r1',
            checkedCount: unknown ? 0 : 1,
            outcome: unknown ? 'unknown' : 'partial',
            staleCount: 1,
          },
        ],
        [
          'library_click',
          { isbn: mismatch ? 'other' : 'B', requestId: 'r1', action: 'library_site' },
        ],
      ]
      if (reverse) rows.push(rows.splice(1, 1)[0])
      if (laterBook)
        rows.splice(
          2,
          0,
          ['book_result_click', { query: 'book', isbn: 'A' }],
          ['book_detail_view', { isbn: 'A' }]
        )
      if (retry)
        rows.splice(rows.length - 1, 0, [
          'holdings_request_completed',
          { isbn: 'B', requestId: 'r2', checkedCount: 1, outcome: 'complete' },
        ])
      if (retry) rows.at(-1)[1].requestId = 'r2'
      for (const [i, [type, payload]] of rows.entries())
        await add(session, type, reordered ? 20 - i : i, {
          ...payload,
          ...(reordered ? { clientTimeMs: base + i * 1000 } : {}),
        })
    }
    await flow('good')
    await flow('reverse', { reverse: true })
    await flow('unknown', { unknown: true })
    await flow('wrong-isbn', { mismatch: true })
    await flow('retry', { retry: true })
    await flow('later-book', { laterBook: true })
    await flow('network-reorder', { reordered: true })
    await add('malformed', 'holdings_request_completed', 0, {
      checkedCount: 'NaN',
      durationMs: 'bad',
      heldCount: 'oops',
      availableCount: '-1',
      clientTimeMs: '999999999999999999999999',
    })
    const day = 86400000,
      now = Date.now()
    const visit = (id, session, daysAgo) =>
      add(session, 'visit', 0, { anonymousId: id, trafficSource: 'retention' }, now - daysAgo * day)
    await visit('returned', 'a1', 10)
    await visit('returned', 'a2', 9)
    await visit('returned', 'a3', 2.5)
    await visit('too-late', 'b1', 10)
    await visit('too-late', 'b2', 1)
    await visit('immature', 'c1', 2)
    await visit('immature', 'c2', 1)
    await visit('day7-boundary', 'd1', 10)
    await visit('day7-boundary', 'd2', 3)
    await visit('same-session', 'e1', 10)
    await visit('same-session', 'e1', 9)
    await add('legacy', 'visit', 0, { schemaVersion: 1 })
    const outputs = []
    for (const statement of statements) outputs.push(await tx.unsafe(statement))
    const funnel = outputs[1].find((row) => row.traffic_source === 'fixture')
    assert.deepEqual(
      Object.fromEntries(
        [
          'visit_sessions',
          'search_sessions',
          'book_select_sessions',
          'book_view_sessions',
          'checked_sessions',
          'next_action_sessions',
        ].map((key) => [key, Number(funnel[key])])
      ),
      {
        visit_sessions: 7,
        search_sessions: 7,
        book_select_sessions: 6,
        book_view_sessions: 6,
        checked_sessions: 5,
        next_action_sessions: 4,
      }
    )
    const cohort = outputs[5][0]
    assert.deepEqual(
      Object.fromEntries(
        ['eligible_7d', 'returned_within_7d', 'eligible_d7', 'returned_d7'].map((key) => [
          key,
          Number(cohort[key]),
        ])
      ),
      {
        eligible_7d: 4,
        returned_within_7d: 2,
        eligible_d7: 4,
        returned_d7: 2,
      }
    )
    console.log(
      '6 SQL queries passed: ordered/matching/retry/later-book/reordered/unknown/legacy/malformed and mature 7d/D7 cohorts'
    )
  })
} finally {
  await sql.end()
}
