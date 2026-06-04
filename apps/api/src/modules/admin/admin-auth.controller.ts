import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminAuthGuard } from './admin-auth.guard'
import { AdminAuthService } from './admin-auth.service'
import { AdminLoginDto } from './dto/admin-login.dto'
import { AdminTotpTicketDto } from './dto/admin-totp-ticket.dto'
import { AdminTotpVerifyDto } from './dto/admin-totp-verify.dto'

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '관리자 1차 로그인' })
  login(@Body() dto: AdminLoginDto) {
    return this.service.login(dto)
  }

  @Post('setup-totp/start')
  @HttpCode(200)
  @ApiOperation({ summary: '관리자 TOTP 설정 시작' })
  startTotpSetup(@Body() dto: AdminTotpTicketDto) {
    return this.service.startTotpSetup(dto)
  }

  @Post('setup-totp/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: '관리자 TOTP 설정 확정' })
  confirmTotpSetup(@Body() dto: AdminTotpVerifyDto) {
    return this.service.confirmTotpSetup(dto)
  }

  @Post('verify-totp')
  @HttpCode(200)
  @ApiOperation({ summary: '관리자 TOTP 로그인 검증' })
  verifyTotp(@Body() dto: AdminTotpVerifyDto) {
    return this.service.verifyTotp(dto)
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: '관리자 현재 세션 조회' })
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : ''
    return this.service.me(token)
  }
}
