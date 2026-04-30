import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { JwtUser } from '@nearbook/shared-types'
import { AuthGuard } from './auth.guard'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  getMe(@Req() req: { user: JwtUser }) {
    return req.user
  }
}
