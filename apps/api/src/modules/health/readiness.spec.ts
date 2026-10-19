jest.mock('@nearbook/db', () => ({ db: { transaction: jest.fn() }, sql: jest.fn() }))

import { db } from '@nearbook/db'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { ReadinessService } from './readiness.service'
import { ReadinessController } from './readiness.controller'
import { OramaIndexService } from '../search/orama-index.service'

describe('readiness dependency checks', () => {
  const transaction = db.transaction as jest.Mock
  const index = { getStatus: jest.fn() }
  const originalRevision = process.env.API_REVISION
  const originalScheduler = process.env.API_SCHEDULER_ENABLED
  let service: ReadinessService

  beforeEach(() => {
    jest.useRealTimers()
    jest.resetAllMocks()
    process.env.API_REVISION = 'a'.repeat(40)
    delete process.env.API_SCHEDULER_ENABLED
    index.getStatus.mockReturnValue({ ready: true })
    transaction.mockImplementation(async (fn) => fn({ execute: jest.fn().mockResolvedValue([]) }))
    service = new ReadinessService(index as unknown as OramaIndexService)
  })
  afterEach(() => {
    jest.useRealTimers()
    if (originalRevision === undefined) delete process.env.API_REVISION
    else process.env.API_REVISION = originalRevision
    if (originalScheduler === undefined) delete process.env.API_SCHEDULER_ENABLED
    else process.env.API_SCHEDULER_ENABLED = originalScheduler
  })

  it('requires both DB and a complete index and reports the exact release/mode', async () => {
    expect(await service.check()).toEqual({
      status: 'ready', checks: { database: true, search: true },
      revision: 'a'.repeat(40), schedulerEnabled: true,
    })
    process.env.API_SCHEDULER_ENABLED = 'false'
    expect(await service.check()).toMatchObject({ schedulerEnabled: false })
    index.getStatus.mockReturnValue({ ready: false })
    expect(await service.check()).toMatchObject({ status: 'not_ready', checks: { database: true, search: false } })
  })
  it('redacts DB failures and retries after recovery', async () => {
    transaction.mockRejectedValueOnce(new Error('postgres://private:secret@host/db'))
    const result = await service.check()
    expect(result).toMatchObject({ status: 'not_ready', checks: { database: false } })
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(await service.check()).toMatchObject({ status: 'ready' })
  })
  it('bounds the HTTP deadline while sharing a pool wait across later requests', async () => {
    jest.useFakeTimers()
    let finish!: (value: boolean) => void
    transaction.mockReturnValueOnce(new Promise<boolean>((resolve) => { finish = resolve }))
    const first = service.check()
    await jest.advanceTimersByTimeAsync(2000)
    expect(await first).toMatchObject({ status: 'not_ready' })
    const second = service.check()
    await jest.advanceTimersByTimeAsync(2000)
    expect(await second).toMatchObject({ status: 'not_ready' })
    expect(transaction).toHaveBeenCalledTimes(1)
    finish(true)
    await Promise.resolve()
    await Promise.resolve()
    expect(await service.check()).toMatchObject({ status: 'ready' })
  })
  it('does not publish arbitrary environment text as a source revision', async () => {
    process.env.API_REVISION = 'invalid-private-value'
    expect(await service.check()).toMatchObject({ revision: 'unknown' })
  })
})

describe('readiness HTTP contract', () => {
  let app: INestApplication
  const check = jest.fn()
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReadinessController],
      providers: [{ provide: ReadinessService, useValue: { check } }],
    }).compile()
    app = module.createNestApplication()
    await app.init()
  })
  afterAll(async () => { await app.close() })
  it.each(['ready', 'not_ready'])('returns no-store and the appropriate status for %s', async (status) => {
    check.mockResolvedValue({ status, checks: { database: status === 'ready', search: true } })
    const response = await request(app.getHttpServer()).get('/ready')
    expect(response.status).toBe(status === 'ready' ? 200 : 503)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body.status).toBe(status)
  })
})
