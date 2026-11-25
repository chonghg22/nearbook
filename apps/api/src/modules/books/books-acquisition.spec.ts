jest.mock('@nearbook/db', () => ({}))
import { HttpException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AuthGuard } from '../auth/auth.guard'
import { BooksController } from './books.controller'
import { BooksService } from './books.service'
import { JeongbonaruProxyController } from '../jeongbonaru/jeongbonaru-proxy.controller'
import { JeongbonaruClient } from '../jeongbonaru/jeongbonaru.client'

describe('public metadata and explicit acquisition HTTP contracts', () => {
  const book = { isbn: '9791161571195', title: 'fixture book', expiresAt: new Date(0) }
  const naru = { getBookByIsbn: jest.fn(), getBookUsageAnalysis: jest.fn() }
  const limiter = { check: jest.fn().mockResolvedValue(undefined) }
  const repo = { findByIsbn: jest.fn() }
  const memory = { get: jest.fn(), set: jest.fn() }
  const proxy = { get: jest.fn(), getStatus: jest.fn().mockResolvedValue({ called: 1 }) }
  let app: import('@nestjs/common').INestApplication
  beforeAll(async () => {
    const service = new BooksService(naru as never, {} as never, {} as never, memory as never, repo as never, {} as never, limiter as never)
    const module = await Test.createTestingModule({
      controllers: [BooksController, JeongbonaruProxyController],
      providers: [{ provide: BooksService, useValue: service }, { provide: JeongbonaruClient, useValue: proxy }],
    }).overrideGuard(AuthGuard).useValue({ canActivate(context: any) {
      const req = context.switchToHttp().getRequest()
      if (req.headers.authorization !== 'Bearer fixture-session') throw new UnauthorizedException()
      req.user = { supabaseUserId: 'verified-fixture-user' }
      return true
    } }).compile()
    app = module.createNestApplication(); await app.init()
  })
  beforeEach(() => {
    jest.clearAllMocks()
    memory.get.mockReturnValue(undefined)
    repo.findByIsbn.mockResolvedValue(undefined)
    naru.getBookByIsbn.mockRejectedValue(new HttpException({ code: 'BOOK_NOT_ACQUIRED' }, 409))
  })
  afterAll(() => app.close())

  it('serves stale cached metadata without fetching or requiring login', async () => {
    repo.findByIsbn.mockResolvedValue(book)
    const response = await request(app.getHttpServer()).get('/books/' + book.isbn).expect(200)
    expect(response.body.title).toBe('fixture book')
    expect(naru.getBookByIsbn).not.toHaveBeenCalled()
    expect(limiter.check).not.toHaveBeenCalled()
  })
  it('passive missing metadata and analysis cannot acquire new books', async () => {
    await request(app.getHttpServer()).get('/books/' + book.isbn).expect(409)
    await request(app.getHttpServer()).get('/books/' + book.isbn + '/analysis').expect(409)
    expect(naru.getBookUsageAnalysis).not.toHaveBeenCalled()
    expect(limiter.check).not.toHaveBeenCalled()
  })
  it('rejects anonymous callers and spoofed trust headers before a new acquisition', async () => {
    await request(app.getHttpServer()).post('/books/' + book.isbn + '/acquire')
      .set('CF-Connecting-IP', '203.0.113.4').set('X-Internal-Request', 'true').expect(401)
    expect(naru.getBookByIsbn).not.toHaveBeenCalled()
  })
  it('uses the authenticated subject and the explicit acquisition path only after a POST', async () => {
    naru.getBookByIsbn.mockResolvedValue(book)
    await request(app.getHttpServer()).post('/books/' + book.isbn + '/acquire')
      .set('Authorization', 'Bearer fixture-session').expect(200)
    expect(limiter.check).toHaveBeenCalledWith('verified-fixture-user')
    expect(naru.getBookByIsbn).toHaveBeenCalledWith(book.isbn, 'HIGH', true)
  })
  it('retains genuine absence as 404 and transient unavailability as 503', async () => {
    naru.getBookByIsbn.mockResolvedValueOnce(null)
    await request(app.getHttpServer()).post('/books/' + book.isbn + '/acquire')
      .set('Authorization', 'Bearer fixture-session').expect(404)
    naru.getBookByIsbn.mockRejectedValueOnce(new HttpException('temporarily unavailable', 503))
    await request(app.getHttpServer()).post('/books/' + book.isbn + '/acquire')
      .set('Authorization', 'Bearer fixture-session').expect(503)
  })
  it('retires direct proxy endpoints regardless of arbitrary keys while retaining status', async () => {
    for (const path of ['bookExist', 'srchBooks', 'usageTrend', 'usageAnalysisList', 'loanItemSrch'])
      await request(app.getHttpServer()).get('/naru/' + path + '?authKey=fake').expect(404)
    await request(app.getHttpServer()).get('/naru/status').expect(200)
    expect(proxy.get).not.toHaveBeenCalled()
  })
})
