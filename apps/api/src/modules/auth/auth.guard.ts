import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

/** 인증 필수 — 401 자동 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  protected async authenticate(context: ExecutionContext, required: boolean) {
    const request = context.switchToHttp().getRequest()
    const header = request.headers.authorization as string | undefined

    if (!header?.startsWith('Bearer ')) {
      if (required) throw new UnauthorizedException()
      request.user = null
      return true
    }

    const accessToken = header.slice('Bearer '.length)
    const user = await this.authService.verifyAccessToken(accessToken)

    if (!user) {
      if (required) throw new UnauthorizedException()
      request.user = null
      return true
    }

    request.user = user
    return true
  }

  canActivate(context: ExecutionContext) {
    return this.authenticate(context, true)
  }
}

/** 인증 선택 — 미인증도 null로 통과 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard {
  canActivate(context: ExecutionContext) {
    return this.authenticate(context, false)
  }
}
