import { Injectable, HttpException } from '@nestjs/common'
import { createHash } from 'crypto'
import { db, sql } from '@nearbook/db'

/** Authenticated subject, never a caller-supplied IP/UA/trust header. Shared across instances. */
@Injectable()
export class BookAcquisitionLimiter {
  async check(subject: string): Promise<void> {
    const key = createHash('sha256').update('book-acquire:' + subject).digest('hex')
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('lock_timeout', '1500ms', true), set_config('statement_timeout', '2500ms', true)`)
      await tx.execute(sql`SELECT pg_advisory_xact_lock(73291013, hashtext(${key}))`)
      const rows = await tx.execute(sql`WITH used AS (
        SELECT count(*) AS day_count, count(*) FILTER (WHERE created_at > now() - interval '1 minute') AS minute_count
        FROM nearbook.book_acquisition_attempts WHERE subject_hash = ${key} AND created_at > now() - interval '1 day'
      ) INSERT INTO nearbook.book_acquisition_attempts(subject_hash)
        SELECT ${key} FROM used WHERE minute_count < 3 AND day_count < 10 RETURNING id`)
      if (!rows.length) throw new HttpException('잠시 후 다시 시도해 주세요.', 429)
    }, { isolationLevel: 'read committed' })
  }
}
