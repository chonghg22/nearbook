jest.mock('@nearbook/db', () => ({}))

import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { JeongbonaruClient } from './modules/jeongbonaru/jeongbonaru.client'
import { JeongbonaruService } from './modules/jeongbonaru/jeongbonaru.service'
import { CacheService } from './common/cache/cache.service'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: JeongbonaruClient,
          useValue: {
            getStatus: () => ({
              called: 0,
              limit: 500,
              remaining: 500,
              utilizationPct: 0,
            }),
          },
        },
        {
          provide: JeongbonaruService,
          useValue: {
            getBookByIsbn: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            size: 0,
          },
        },
      ],
    }).compile()
    appController = app.get<AppController>(AppController)
  })

  it('/health → status ok', async () => {
    const health = await appController.health()
    expect(health.status).toBe('ok')
  })
})
