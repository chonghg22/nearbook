// No application env files, database client or provider credentials are loaded.
jest.mock('@nearbook/db', () => ({
  db: { transaction: jest.fn(async (fn) => fn({ execute: jest.fn(async () => []) })) },
  sql: jest.requireActual('drizzle-orm').sql,
}))

import { Test } from '@nestjs/testing'
import { SchedulerRegistry } from '@nestjs/schedule'
import request from 'supertest'
import { ConfigService } from '@nestjs/config'
import { SearchIndexRepository } from '../search/search-index.repository'

describe('actual AppModule preflight wiring', () => {
  it('builds an index and serves readiness without registering any scheduled jobs', async () => {
    const prior = process.env.API_SCHEDULER_ENABLED
    process.env.API_SCHEDULER_ENABLED = 'false'
    // Import after setting the mode because ScheduleModule options are static.
    const { AppModule } = await import('../../app.module')
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue({
        get: (key: string) => key === 'SUPABASE_JWT_SECRET' ? 'isolated-test-only' : undefined,
      })
      .overrideProvider(SearchIndexRepository).useValue({
        snapshot: async (fn: (reader: object) => Promise<unknown>) => fn({}),
        popularity: async () => ({ scores: new Map(), period: null }),
        page: async () => [],
      }).compile()
    const app = module.createNestApplication()
    try {
      await app.init()
      const scheduler = app.get(SchedulerRegistry)
      expect(scheduler.getCronJobs().size).toBe(0)
      expect(scheduler.getIntervals()).toHaveLength(0)
      expect(scheduler.getTimeouts()).toHaveLength(0)
      const response = await request(app.getHttpServer()).get('/ready')
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        status: 'ready', schedulerEnabled: false, checks: { database: true, search: true },
      })
      expect((await request(app.getHttpServer()).get('/health')).body.status).toBe('ok')
    } finally {
      await app.close()
      if (prior === undefined) delete process.env.API_SCHEDULER_ENABLED
      else process.env.API_SCHEDULER_ENABLED = prior
    }
  })
})
