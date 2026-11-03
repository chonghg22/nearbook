import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { JwtUser } from '@nearbook/shared-types'
import { AuthGuard } from './auth.guard'
import { KakaoOAuthClient, KakaoOAuthError } from './kakao-oauth.client'
import { SessionService } from './session.service'
import { KakaoSessionDto, RefreshTokenDto } from './dto/auth-session.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly kakao: KakaoOAuthClient,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {}

  /** Refuse to open sessions with a missing/weak signing secret instead of failing mid-login. */
  private assertSigningConfigured() {
    if ((this.config.get<string>('AUTH_JWT_SECRET') ?? '').length < 32)
      throw new ServiceUnavailableException('login_unavailable')
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getMe(@Req() req: { user: JwtUser }) {
    return req.user
  }

  /** Called server-to-server by the web OAuth callback. Provider errors are never echoed.
   * No per-route throttle: behind the tunnel/Vercel every caller shares one client IP. */
  @Post('kakao/session')
  @HttpCode(200)
  async kakaoSession(@Body() body: KakaoSessionDto, @Headers('user-agent') userAgent?: string) {
    this.assertSigningConfigured()
    let profile
    try {
      profile = await this.kakao.exchangeCode(body.code, body.redirectUri)
    } catch (error) {
      if (error instanceof KakaoOAuthError && error.reason === 'not-configured')
        throw new ServiceUnavailableException('login_unavailable')
      throw new UnauthorizedException('login_failed')
    }
    return this.sessions.signIn('kakao', profile.providerUserId, profile.nickname, userAgent)
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshTokenDto) {
    const session = await this.sessions.refresh(body.refreshToken)
    if (!session) throw new UnauthorizedException('session_expired')
    return session
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: RefreshTokenDto) {
    await this.sessions.revoke(body.refreshToken)
  }
}
