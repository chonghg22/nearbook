import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { SessionService } from './session.service'
import { KakaoOAuthClient } from './kakao-oauth.client'
import { AuthController } from './auth.controller'

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('AUTH_JWT_SECRET'),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, KakaoOAuthClient],
  exports: [AuthService, SessionService, JwtModule],
})
export class AuthModule {}
