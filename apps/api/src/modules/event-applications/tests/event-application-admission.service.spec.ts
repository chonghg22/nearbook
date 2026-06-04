import { EventApplicationAdmissionService } from '../services/event-application-admission.service'

describe('EventApplicationAdmissionService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('allows all requests when admission mode is off', async () => {
    process.env.EVENT_ADMISSION_MODE = 'off'
    const service = new EventApplicationAdmissionService()

    const result = await service.waitForTurn(1, 1)

    expect(result.allowed).toBe(true)
    expect(result.mode).toBe('off')
    expect(result.waitedMs).toBe(0)
  })

  it('limits memory mode requests per program window', async () => {
    process.env.EVENT_ADMISSION_MODE = 'memory'
    process.env.EVENT_ADMISSION_PER_SECOND = '1'
    process.env.EVENT_ADMISSION_WAIT_MS = '5'
    process.env.EVENT_ADMISSION_RETRY_STEP_MS = '1'
    const service = new EventApplicationAdmissionService()

    const first = await service.waitForTurn(1, 1)
    const second = await service.waitForTurn(1, 2)

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(false)
    expect(second.mode).toBe('memory')
  })
})
