import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AdminAuthService } from './admin-auth.service'

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()
    const header = request.headers.authorization as string | undefined

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException()
    }

    const accessToken = header.slice('Bearer '.length)
    const user = await this.adminAuthService.verifyAccessToken(accessToken)
    request.user = user
    return true
  }
}
