import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './services/auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('SUPABASE_JWT_SECRET'),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule, JwtStrategy],
})
export class AuthModule {}
