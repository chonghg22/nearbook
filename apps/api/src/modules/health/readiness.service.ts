import { Injectable } from '@nestjs/common'
import { db, sql } from '@nearbook/db'
import { OramaIndexService } from '../search/orama-index.service'

@Injectable()
export class ReadinessService {
  // Share a pending DB check even after the HTTP deadline. An exhausted pool
  // must not accumulate a new transaction for every probe.
  private pending: Promise<boolean> | null = null

  constructor(private readonly index: OramaIndexService) {}

  private database(): Promise<boolean> {
    if (!this.pending) {
      this.pending = db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL statement_timeout = '1500ms'`)
        await tx.execute(sql`SELECT 1`)
        return true
      }, { accessMode: 'read only' }).catch(() => false).finally(() => { this.pending = null })
    }
    return this.pending
  }

  async check() {
    let timer: ReturnType<typeof setTimeout> | undefined
    const database = await Promise.race([
      this.database(),
      new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), 2000) }),
    ]).finally(() => clearTimeout(timer))
    const search = this.index.getStatus().ready
    return {
      status: database && search ? 'ready' : 'not_ready',
      checks: { database, search },
      revision: /^[a-f0-9]{40}$/.test(process.env.API_REVISION ?? '')
        ? process.env.API_REVISION : 'unknown',
      schedulerEnabled: process.env.API_SCHEDULER_ENABLED !== 'false',
    }
  }
}
