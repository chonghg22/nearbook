import type { ExecutionContext } from '@nestjs/common'
import { AuthGuard, OptionalAuthGuard } from './auth.guard'
import type { AuthService } from './auth.service'

jest.mock('./auth.service', () => ({ AuthService: jest.fn() }))

describe('local user initialization after Supabase verification', () => {
  const service = { verifyAccessToken: jest.fn(), getOrCreateUser: jest.fn() }
  const user = { supabaseUserId: 'verified-id', email: 'test@example.invalid', provider: 'kakao', nickname: 'test' }
  const context = (request: object) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as ExecutionContext
  beforeEach(() => jest.resetAllMocks())

  it('initializes the application row only after verifying identity', async () => {
    service.verifyAccessToken.mockResolvedValue(user)
    service.getOrCreateUser.mockResolvedValue({ id: 1 })
    const request = { headers: { authorization: 'Bearer verified-token' }, user: undefined }
    const guard = new AuthGuard(service as unknown as AuthService)
    await expect(guard.canActivate(context(request))).resolves.toBe(true)
    expect(service.getOrCreateUser).toHaveBeenCalledWith(user.supabaseUserId, user.email, user.nickname)
    expect(request.user).toEqual(user)
  })

  it('rejects invalid identities without creating database users', async () => {
    service.verifyAccessToken.mockResolvedValue(null)
    const guard = new AuthGuard(service as unknown as AuthService)
    await expect(guard.canActivate(context({ headers: { authorization: 'Bearer invalid' } }))).rejects.toThrow()
    expect(service.getOrCreateUser).not.toHaveBeenCalled()
  })

  it('does not accept a request when initialization fails', async () => {
    service.verifyAccessToken.mockResolvedValue(user)
    service.getOrCreateUser.mockRejectedValue(new Error('database unavailable'))
    const request = { headers: { authorization: 'Bearer verified-token' }, user: undefined }
    await expect(new AuthGuard(service as unknown as AuthService).canActivate(context(request))).rejects.toThrow('database unavailable')
    expect(request.user).toBeUndefined()
  })

  it('leaves anonymous optional requests anonymous without touching the database', async () => {
    const request = { headers: {}, user: undefined }
    await expect(new OptionalAuthGuard(service as unknown as AuthService).canActivate(context(request))).resolves.toBe(true)
    expect(request.user).toBeNull()
    expect(service.verifyAccessToken).not.toHaveBeenCalled()
    expect(service.getOrCreateUser).not.toHaveBeenCalled()
  })
})
